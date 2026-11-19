# Runs the learner's program the way `python3 main.py` would, and reports a failure as data.
# The traceback text is Python's own, so the lines, columns and ^^^^ markers match a real terminal.
import sys, json, linecache, traceback

def _chars(line, offset):
    # Python reports columns in UTF-8 bytes; the editor counts characters.
    if offset is None:
        return None
    try:
        return len(line.encode('utf-8')[:offset].decode('utf-8', 'ignore'))
    except Exception:
        return offset

def __uzbit_run(source, user_lines=None):
    lines = source.split('\n')
    if user_lines is not None and user_lines < len(lines):
        main_src = '\n'.join(lines[:user_lines])
        judge_src = '\n'.join(lines[user_lines:]).lstrip('\n')
    else:
        main_src, judge_src = source, ''
    files = {'main.py': main_src.split('\n'), 'judge.py': judge_src.split('\n')}
    for name, text in (('main.py', main_src), ('judge.py', judge_src)):
        linecache.cache[name] = (len(text), None, text.splitlines(True), name)

    result = {'ok': True}
    stage = 'compile'
    try:
        parts = [compile(main_src, 'main.py', 'exec')]
        if judge_src:
            parts.append(compile(judge_src, 'judge.py', 'exec'))
        stage = 'run'
        scope = {'__name__': '__main__'}
        for code in parts:
            exec(code, scope)
    except SystemExit as e:
        code = e.code
        if code not in (None, 0):
            if isinstance(code, int):
                result = {'ok': False, 'py': {'name': 'SystemExit', 'message': '', 'text': '', 'frames': [], 'exit': code}}
            else:
                result = {'ok': False, 'py': {'name': 'SystemExit', 'message': str(code), 'text': str(code) + '\n', 'frames': [], 'exit': 1}}
    except BaseException as e:
        tb = e.__traceback__
        # The first frame is this runner's own exec call; a real terminal never shows it.
        if tb is not None and tb.tb_frame.f_code is __uzbit_run.__code__:
            tb = tb.tb_next
        if stage == 'compile':
            tb = None
        text = ''.join(traceback.format_exception(type(e), e, tb))
        frames = []
        for fs in traceback.extract_tb(tb):
            if fs.filename not in files:
                continue
            src = files[fs.filename]
            line = src[fs.lineno - 1] if 0 < fs.lineno <= len(src) else ''
            col = _chars(line, fs.colno)
            end = _chars(line, fs.end_colno) if fs.end_lineno == fs.lineno else None
            frames.append({
                'file': fs.filename, 'fn': fs.name, 'line': fs.lineno,
                'col': None if col is None else col + 1,
                'endCol': None if end is None else end + 1,
            })
        syntax = None
        if isinstance(e, SyntaxError) and e.lineno:
            end_off = e.end_offset if (e.end_lineno in (None, e.lineno)) else None
            syntax = {'line': e.lineno, 'col': e.offset or 1, 'endCol': end_off}
        message = (e.msg if isinstance(e, SyntaxError) else str(e)) or ''
        result = {'ok': False, 'py': {'name': type(e).__name__, 'message': message, 'text': text, 'frames': frames, 'syntax': syntax}}
    finally:
        try:
            sys.stdout.flush()
            sys.stderr.flush()
        except Exception:
            pass
        for name in ('main.py', 'judge.py'):
            linecache.cache.pop(name, None)
    return json.dumps(result)
