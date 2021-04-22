const axios = require('axios');
const { get } = require('dot-prop');
const { useRef } = require('react');
const { parse, stringify } = require('telejson');

// exposed for function component
function useDebug(current, details = '') {
  const ref = useRef({ props: {}, state: {}});
  const [component, loc] = caller();
  return internalUseDebug({
    component,
    current,
    details,
    loc: getLoc(loc),
    ref: ref.current,
  });
}

// exposed for class component
function useDebugClass(instance, details) {
  instance.ref = instance.ref || { props: {}, state: {}};
  const component = instance.constructor.name;
  const { fileName, lineNumber } = get(instance, '_reactInternals._debugSource') ||
    get(instance, '_reactInternals.firstEffect._debugSource') || {};
  const { props, state } = instance;
  return internalUseDebug({
    component,
    current: { props, state },
    details,
    loc: [fileName, lineNumber],
    ref: instance.ref,
  });
}

// main function
function internalUseDebug({ current, details, ref, component, loc }) {
  const head = getHead(component, details);
  const actual = { ...ref, ...current };
  const log = getLog(loc, head, actual, ref);

  if (isFirst(ref, actual)) {
    log('first rendering');
    ['props', 'state'].forEach(block => {
      Object.entries(actual[block]).forEach(([key, value]) => { ref[block][key] = value; });
    });
    return;
  }
  let change = false;

  ['props', 'state'].forEach(block => {
    Object.entries(actual[block]).forEach(([key, value]) => {
      if (value === ref[block][key]) return;
      if (!has(ref[block], key)) {
        change = true;
        log(`new key : ${block}.${key}`);
        ref[block][key] = value;
      } else if (value !== ref[block][key]) {
        change = true;
        log(`new value for : ${block}.${key}\nnewValue: `, value,
          '\noldValue: ', ref[block][key], '\n');
        ref[block][key] = value;
      }
    });
    Object.keys(ref[block]).forEach(key => {
      if (!has(actual[block], key)) {
        change = true;
        log(`deleted key : ${block}.${key}`);
      }
    });
  });

  if (change) return;
  const actualStr = stringify(actual, { space: 2 });
  const refStr = stringify(ref, { space: 2 });

  if (actualStr !== refStr) {
    log('deep change', { actualStr, refStr });
    return;
  }
  log('unchanged');
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

function getLog(loc, head, actual, ref) {
  const debug = { actual, json: freeze({ actual, ref }), ref };
  const open = {};

  Promise.resolve(loc).then(location => { open.url = openFile(...location); });
  return function log(...message) {
    // eslint-disable-next-line no-console
    console.debug(...head, ...message, { ...debug, open });
  };
}

function has(obj, key) {
  return Reflect.apply(Object.prototype.hasOwnProperty, obj, [key]);
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
