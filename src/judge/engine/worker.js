/*
 * Judge worker. Runs untrusted code off the main thread so infinite loops
 * can be stopped by terminating the worker. Loaded as a classic worker.
 *
 * Requests:  { id, language: 'javascript' | 'typescript' | 'python', code, stdin }
 * Responses: { id, kind: 'ok' | 'runtime' | 'compile', stdout, error }
 */
// Replaced by the runner with the app's absolute base URL, because a blob
// worker cannot resolve relative paths. Runtimes are served from public/.
var ASSET_BASE = '__ASSET_BASE__';
var PYODIDE_URL = ASSET_BASE + 'pyodide/pyodide.js';
var PYODIDE_INDEX = ASSET_BASE + 'pyodide/';
var TYPESCRIPT_URL = ASSET_BASE + 'vendor/typescript.js';

var pythonPromise = null;
var tsCompiler = null;

function splitLines(text) {
  return text.split('\n').map(function (l) { return l.replace(/\r$/, ''); });
}

function formatValue(v) {
  if (typeof v === 'string') return v;
  if (v === undefined) return 'undefined';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  return String(v);
}

/** Runs JavaScript with input(), readAll(), print() and a captured console. */
function runJavaScript(code, stdin) {
  var out = [];
  var lines = splitLines(stdin);
  var cursor = 0;
  var print = function () {
    out.push(Array.prototype.map.call(arguments, formatValue).join(' '));
  };
  var input = function () {
    if (cursor >= lines.length) throw new Error('input(): no more lines on standard input');
    return lines[cursor++];
  };
  var readAll = function () { return stdin; };
  var fakeConsole = {
    log: print,
    info: print,
    warn: print,
    error: print,
  };
  try {
    var fn = new Function('console', 'print', 'input', 'readAll', code);
    fn(fakeConsole, print, input, readAll);
    return { kind: 'ok', stdout: out.join('\n') };
  } catch (err) {
    return { kind: 'runtime', stdout: out.join('\n'), error: String(err && err.message ? err.message : err) };
  }
}

function loadTypeScript() {
  if (!tsCompiler) {
    importScripts(TYPESCRIPT_URL);
    tsCompiler = self.ts;
  }
  return tsCompiler;
}

function runTypeScript(code, stdin) {
  var ts;
  try {
    ts = loadTypeScript();
  } catch (err) {
    return { kind: 'runtime', stdout: '', error: 'Could not load the TypeScript compiler: ' + err.message };
  }
  var result = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  });
  if (result.diagnostics && result.diagnostics.length) {
    var msg = result.diagnostics.map(function (d) {
      return ts.flattenDiagnosticMessageText(d.messageText, '\n');
    }).join('\n');
    return { kind: 'compile', stdout: '', error: msg };
  }
  return runJavaScript(result.outputText, stdin);
}

function ensurePython() {
  if (!pythonPromise) {
    pythonPromise = (async function () {
      importScripts(PYODIDE_URL);
      return await self.loadPyodide({ indexURL: PYODIDE_INDEX, fullStdLib: false });
    })();
    // Allow a retry after a failed load.
    pythonPromise.catch(function () { pythonPromise = null; });
  }
  return pythonPromise;
}

async function runPython(code, stdin) {
  var py = await ensurePython();
  var out = [];
  var lines = splitLines(stdin);
  var cursor = 0;
  py.setStdout({ batched: function (s) { out.push(s); } });
  py.setStderr({ batched: function (s) { out.push(s); } });
  py.setStdin({
    stdin: function () {
      if (cursor >= lines.length) return undefined;
      return lines[cursor++];
    },
  });
  // Each run gets fresh globals so tests cannot leak state into each other.
  var globals = py.runPython('dict()');
  try {
    await py.runPythonAsync(code, { globals: globals });
    return { kind: 'ok', stdout: out.join('\n') };
  } catch (err) {
    var message = String(err && err.message ? err.message : err);
    return { kind: 'runtime', stdout: out.join('\n'), error: lastLine(message) };
  }
}

function lastLine(text) {
  var parts = text.trim().split('\n');
  return parts[parts.length - 1] || text;
}

self.onmessage = async function (event) {
  var req = event.data;
  var result;
  try {
    if (req.language === 'python') result = await runPython(req.code, req.stdin);
    else if (req.language === 'typescript') result = runTypeScript(req.code, req.stdin);
    else result = runJavaScript(req.code, req.stdin);
  } catch (err) {
    result = { kind: 'runtime', stdout: '', error: String(err && err.message ? err.message : err) };
  }
  result.id = req.id;
  self.postMessage(result);
};
