const axios = require('axios');
const { get, has, set } = require('dot-prop');
const { useRef } = require('react');
const { parse, stringify } = require('telejson');

// exposed for function component
function useDebug(data, details) {
  const ref = useRef({ props: {}, state: {}});
  const [component, loc] = caller();

  ['props', 'state'].forEach(key => { if (!has(data, key)) set(data, key, {}); });
  return internalUseDebug({
    NEW: data,
    OLD: ref.current,
    component,
    details,
    loc: getLoc(loc),
  });
}

// exposed for class component
function useDebugClass(instance, details) {
  instance.ref = instance.ref || { props: {}, state: {}};
  const component = instance.constructor.name;
  const { fileName, lineNumber } =
    get(instance, '_reactInternalFiber._debugSource') ||
    get(instance, '_reactInternals._debugSource') ||
    get(instance, '_reactInternals.firstEffect._debugSource') ||
    {};
  const { props, state } = instance;
  return internalUseDebug({
    NEW: { props, state },
    OLD: instance.ref,
    component,
    details,
    loc: [fileName, lineNumber],
  });
}

// main function
function internalUseDebug({ NEW, OLD, details, component, loc }) {
  const head = getHead(component, details);
  const log = getLog(loc, head, NEW, OLD);

  if (isFirst(OLD, NEW)) {
    log('first rendering');
    ['props', 'state'].forEach(block => {
      Object.entries(NEW[block]).forEach(([key, value]) => { OLD[block][key] = value; });
    });
    return log;
  }
  let change = false;

  ['props', 'state'].forEach(block => {
    Object.entries(NEW[block]).forEach(([key, value]) => {
      if (value === OLD[block][key]) return;
      if (!has(OLD[block], key)) {
        change = true;
        log(`new key : ${block}.${key}`);
        OLD[block][key] = value;
      } else if (value !== OLD[block][key]) {
        change = true;
        log(`new value for : ${block}.${key}\nnewValue: `, value,
          '\noldValue: ', OLD[block][key], '\n');
        OLD[block][key] = value;
      }
    });
    Object.keys(OLD[block]).forEach(key => {
      if (!has(NEW[block], key)) {
        change = true;
        log(`deleted key : ${block}.${key}`);
      }
    });
  });

  if (!change) {
    const NEWStr = stringify(NEW, { space: 2 });
    const OLDStr = stringify(OLD, { space: 2 });

    if (NEWStr === OLDStr) log('unchanged');
    else log.error('deep change', { NEWStr, OLDStr });
  }

  return log;
}

// utils
const hueCache = {};
let nextHue = 0;
const fileCache = {};

function caller(depth = 1) {
  const stack = new Error().stack.split('\n');
  return stack[depth + 1].split('@').concat([stack]);
}

function freeze(obj) {
  return parse(stringify(obj));
}

function getFile(filename) {
  if (!has(fileCache, filename))
    fileCache[filename] = axios.get(filename).then(({ data }) => Promise.resolve(data));
  return fileCache[filename];
}

function getHead(component, details) {
  if (details) return [`%c${component} %c${details}`, getHSL(component), getHSL(details)];
  return [`%c${component}`, getHSL(component)];
}

function getHSL(id) {
  const hue = getHue(id);
  // eslint-disable-next-line no-magic-numbers
  const hsl = `color: ${hue > 200 && hue < 300 ? 'white' : 'black'};\
    background: hsl(${hue}, 100%, 50%);\
    padding: 0 1em;`;
  return hsl;
}

function getHue(id) {
  if (has(hueCache, id)) return hueCache[id];
  const hue = nextHue;

  // eslint-disable-next-line no-magic-numbers
  nextHue = (hue + 210) % 360;
  hueCache[id] = hue;
  return hue;
}

function getLoc(loc) {
  const lineIndex = -2;
  let [index] = loc.split(':').slice(lineIndex);
  const filename = loc.split(':').slice(0, lineIndex).join(':');
  return getFile(filename).then(file => {
    const lines = file.split('\n');

    for (; index >= 0; --index) {
      if (lines[index].includes('_jsxFileName = '))
        return [JSON.parse(`"${lines[index].split('"')[1]}"`)];
    }
    return [null];
  });
}

function getLog(loc, head, NEW, OLD) {
  const debug = { NEW, OLD, json: freeze({ NEW, OLD }) };
  const token = getToken(OLD, head);
  const open = {};

  Promise.resolve(loc).then(location => { open.url = openFile(...location); });
  log.error = (...message) => console.error(...token, ...message, { ...debug, open });
  return log;

  function log(...message) {
    console.debug(...token, ...message, { ...debug, open });
  }
}

function getToken(ref, head) {
  const [title, ...styles] = head;

  ref.renderIndex = (ref.renderIndex || 0) + 1;
  return [
    `${title} %c${ref.renderIndex}`,
    ...styles,
    'color: white; background: red; padding: 0 0.2em; margin: 0 0.1em;',
  ];
}

function isFirst(ref, current) {
  return Object.keys(ref.props).join() === '' &&
    Object.keys(ref.state).join() === '' &&
    (
      Object.keys(current.props).join() !== '' ||
      Object.keys(current.props).join() !== ''
    );
}

function openFile(filename, line = 1, col = 1) {
  const encFilename = encodeURIComponent(filename);
  return `http://localhost:3000/__open-stack-frame-in-editor?\
fileName=${encFilename}&lineNumber=${line}&colNumber=${col}`;
}

module.exports = useDebug;
module.exports.debug = useDebugClass;
module.exports.useDebug = useDebug;
module.exports.default = useDebug;
