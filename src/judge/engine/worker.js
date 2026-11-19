/*
 * Judge worker. Runs untrusted code off the main thread so infinite loops
 * can be stopped by terminating the worker. Loaded as a classic worker.
 *
 * Requests:  { id, language: 'javascript' | 'typescript' | 'python', code, stdin, userLines }
 * Responses: { id, kind: 'ok' | 'runtime' | 'compile', stream, err, py, ts }
 * Progress:  { id, chunk: { fd, text } } while the program runs, so output survives a timeout.
 *
 * Reporting stays raw here (stack text, traceback data). The page turns it into
 * terminal text in diagnostics.ts, where it can be tested.
 */
// Replaced by the runner, because a blob worker cannot resolve relative paths.
var ASSET_BASE = '__ASSET_BASE__';
var PY_BOOT = '__PY_BOOT__';
var PYODIDE_URL = ASSET_BASE + 'pyodide/pyodide.js';
var PYODIDE_INDEX = ASSET_BASE + 'pyodide/';
var TYPESCRIPT_URL = ASSET_BASE + 'vendor/typescript.js';

// Must match JS_PREFIX in diagnostics.ts. The learner's code starts right after it on line 1.
var JS_PREFIX = '(function(console,print,input,readAll){';
var OUTPUT_LIMIT = 1000000;
var STREAM_POSTS_LIMIT = 4000;

var pythonPromise = null;
var pyRunner = null;
var tsCompiler = null;

function splitLines(text) {
  var lines = text.split('\n').map(function (l) { return l.replace(/\r$/, ''); });
  // A final newline ends the last line; it does not start another one.
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function formatValue(v) {
  if (typeof v === 'string') return v;
  if (v === undefined) return 'undefined';
  if (typeof v === 'object' && v !== null) {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  return String(v);
}

/** Collects output in order and streams it to the page as it is written. */
function makeSink(id) {
  var stream = [];
  var size = 0;
  var posts = 0;
  var truncated = false;
  return {
    stream: stream,
    write: function (fd, text) {
      if (truncated || !text) return;
      if (size + text.length > OUTPUT_LIMIT) {
        text = text.slice(0, Math.max(0, OUTPUT_LIMIT - size)) + '\n[output truncated]\n';
        truncated = true;
      }
      size += text.length;
      var last = stream[stream.length - 1];
      if (last && last.fd === fd) last.text += text;
      else stream.push({ fd: fd, text: text });
      if (posts++ < STREAM_POSTS_LIMIT) self.postMessage({ id: id, chunk: { fd: fd, text: text } });
    },
  };
}

function errorInfo(err) {
  if (err && typeof err === 'object' && 'message' in err) {
    return { name: String(err.name || 'Error'), message: String(err.message), stack: String(err.stack || '') };
  }
  return { name: 'Uncaught', message: formatValue(err), stack: '' };
}

/** TypeScript is only loaded when needed; null when the file is not there. */
function loadTypeScript() {
  if (!tsCompiler) {
    try {
      importScripts(TYPESCRIPT_URL);
      tsCompiler = self.ts;
    } catch (err) {
      return null;
    }
  }
  return tsCompiler;
}

function lineCol(text, pos) {
  var before = text.slice(0, pos).split('\n');
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

/**
 * Chrome does not say where a syntax error is. Safari and Firefox do. When the
 * browser is silent, the TypeScript parser finds the place (the message stays the browser's own).
 */
function locateSyntaxError(code, err) {
  var line = err.line || err.lineNumber;
  var column = err.column || err.columnNumber;
  if (line && column) {
    return { line: line, column: line === 1 ? Math.max(1, column - JS_PREFIX.length) : column };
  }
  var ts = loadTypeScript();
  if (!ts) return null;
  var out = ts.transpileModule(code, { reportDiagnostics: true, fileName: 'main.js', compilerOptions: { target: ts.ScriptTarget.ES2020 } });
  var d = (out.diagnostics || []).find(function (x) { return typeof x.start === 'number'; });
  if (!d) return null;
  var start = lineCol(code, d.start);
  var end = lineCol(code, d.start + (d.length || 1));
  return { line: start.line, column: start.column, endColumn: end.line === start.line && end.column > start.column ? end.column : undefined };
}

/** Runs JavaScript with input(), readAll(), print() and a captured console. */
function runJavaScript(code, stdin, id, extra) {
  var sink = makeSink(id);
  var lines = splitLines(stdin);
  var cursor = 0;
  var print = function () { sink.write(1, Array.prototype.map.call(arguments, formatValue).join(' ') + '\n'); };
  var warn = function () { sink.write(2, Array.prototype.map.call(arguments, formatValue).join(' ') + '\n'); };
  var input = function () {
    if (cursor >= lines.length) throw new Error('input(): no more lines on standard input');
    return lines[cursor++];
  };
  var readAll = function () { return stdin; };
  var fakeConsole = { log: print, info: print, debug: print, warn: warn, error: warn };

  var fn;
  try {
    fn = (0, eval)(JS_PREFIX + code + '\n})\n//# sourceURL=main.js');
  } catch (err) {
    var info = errorInfo(err);
    if (err instanceof SyntaxError) info.syntaxAt = locateSyntaxError(extra && extra.original ? extra.original : code, err);
    return { kind: 'compile', stream: sink.stream, err: info };
  }
  try {
    fn(fakeConsole, print, input, readAll);
    return { kind: 'ok', stream: sink.stream };
  } catch (err) {
    return { kind: 'runtime', stream: sink.stream, err: errorInfo(err) };
  }
}

function runTypeScript(code, stdin, id) {
  var ts = loadTypeScript();
  if (!ts) {
    return { kind: 'runtime', stream: [], err: { name: 'Error', message: 'Could not load the TypeScript compiler.', stack: '' } };
  }
  var result = ts.transpileModule(code, {
    reportDiagnostics: true,
    fileName: 'main.ts',
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None, sourceMap: true },
  });
  var diags = (result.diagnostics || []).map(function (d) {
    var text = d.file ? d.file.text : code;
    var start = lineCol(text, d.start || 0);
    var end = lineCol(text, (d.start || 0) + (d.length || 1));
    return {
      code: d.code,
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      line: start.line,
      column: start.column,
      endColumn: end.line === start.line && end.column > start.column ? end.column : undefined,
    };
  });
  if (diags.length) return { kind: 'compile', stream: [], ts: { diagnostics: diags } };
  var js = result.outputText.replace(/\/\/# sourceMappingURL=.*$/m, '');
  var out = runJavaScript(js, stdin, id, { original: code });
  out.ts = { sourceMap: result.sourceMapText };
  return out;
}

function ensurePython() {
  if (!pythonPromise) {
    pythonPromise = (async function () {
      importScripts(PYODIDE_URL);
      var py = await self.loadPyodide({ indexURL: PYODIDE_INDEX, fullStdLib: false });
      py.runPython(PY_BOOT);
      pyRunner = py.globals.get('__uzbit_run');
      return py;
    })();
    // Allow a retry after a failed load.
    pythonPromise.catch(function () { pythonPromise = null; });
  }
  return pythonPromise;
}

async function runPython(code, stdin, id, userLines) {
  var py = await ensurePython();
  var sink = makeSink(id);
  var lines = splitLines(stdin);
  var cursor = 0;
  var decoders = { 1: new TextDecoder(), 2: new TextDecoder() };
  py.setStdout({ write: function (buf) { sink.write(1, decoders[1].decode(buf, { stream: true })); return buf.length; } });
  py.setStderr({ write: function (buf) { sink.write(2, decoders[2].decode(buf, { stream: true })); return buf.length; } });
  py.setStdin({
    stdin: function () {
      if (cursor >= lines.length) return undefined;
      return lines[cursor++];
    },
  });
  var raw = pyRunner(code, userLines === undefined ? null : userLines);
  var report = JSON.parse(raw);
  if (report.ok) return { kind: 'ok', stream: sink.stream };
  var syntax = report.py.syntax;
  return { kind: syntax ? 'compile' : 'runtime', stream: sink.stream, py: report.py };
}

self.onmessage = async function (event) {
  var req = event.data;
  var result;
  try {
    if (req.language === 'python') result = await runPython(req.code, req.stdin, req.id, req.userLines);
    else if (req.language === 'typescript') result = runTypeScript(req.code, req.stdin, req.id);
    else result = runJavaScript(req.code, req.stdin, req.id);
  } catch (err) {
    result = { kind: 'runtime', stream: [], err: errorInfo(err) };
  }
  result.id = req.id;
  self.postMessage(result);
};
