export enum PuzzleGroup {
  Beginner = "Beginner",
  Bases = "Bases",
  Math = "Math",
  Eval = "Eval",
  Random = "Random",
  Objects = "Objects",
  // TODO: sort and remove any with this
  Unknown = "Unknown",
}

export interface Puzzle {
  id: string;
  name: string;
  source: string;
  group: PuzzleGroup;
}

export const puzzles: Puzzle[] = [
  {
    id: "aad5a036-f677-402b-b48f-13393a8cde9a",
    group: PuzzleGroup.Beginner,
    name: "simple",
    source: `function simple(x) {
  return x;
}`,
  },
  {
    id: "531b0815-744a-4e27-b7a6-4fc89d3125bd",
    group: PuzzleGroup.Beginner,
    name: "identityCrisis",
    source: `function identityCrisis(x) {
  return x != x;
}`,
  },
  {
    id: "582c046c-9937-412e-8742-28516cb08e76",
    group: PuzzleGroup.Beginner,
    name: "sameSameButDifferent",
    source: `function sameSameButDifferent(x, y) {
  return x === y && 1/x < 1/y
}`,
  },
  {
    id: "c1ee858e-6838-4161-bf62-89be0fca23d0",
    group: PuzzleGroup.Beginner,
    name: "contradiction",
    source: `function contradiction(x,y,z) {
  return x && x == y && y == z && x != z;
}`,
  },
  {
    id: "333c52ae-d933-44e7-8cd8-95017ee736dd",
    group: PuzzleGroup.Beginner,
    name: "countingClosures",
    source: `function countingClosures(f) {
  var a = f(), b = f();
  return a() == 1 && a() == 2 && a() == 3
      && b() == 1 && b() == 2;
}`,
  },
  {
    id: "cb1de7f3-852b-4558-a691-43931d5caed9",
    group: PuzzleGroup.Beginner,
    name: "safety",
    source: `function safety(x) {
  return (x++ !== x) && (x++ === x);
}`,
  },
  {
    id: "cea8c90b-a514-4e71-ab82-b4b8b37e08b9",
    group: PuzzleGroup.Objects,
    name: "array",
    source: `function array(x,y) {
  return Array.isArray(x) && !(x instanceof Array) &&
        !Array.isArray(y) &&  (y instanceof Array);
}`,
  },
  {
    id: "6ad14ec8-282e-4281-be36-bb3685805e03",
    group: PuzzleGroup.Objects,
    name: "chickenOrEgg",
    source: `function chickenOrEgg(x,y) {
  return x instanceof y && y instanceof x && x !== y;
}`,
  },
  {
    id: "872874cc-ba73-45e1-89d8-90d0348c1760",
    group: PuzzleGroup.Objects,
    name: "instance2",
    source: `function instance2(a,b,c) {
  return a !== b && b !== c && a !== c
      && a instanceof b
      && b instanceof c
      && c instanceof a;
}`,
  },
  {
    id: "93320cc6-3235-4a5a-8f71-758d57122559",
    group: PuzzleGroup.Objects,
    name: "proto1",
    source: `function proto1(x) {
  return x && !("__proto__" in x);
}`,
  },
  {
    id: "52c216a4-5b84-43fc-b193-88ee1caac6a3",
    group: PuzzleGroup.Objects,
    name: "undef",
    source: `function undef(x) {
  return !{ undefined: { undefined: 1 } }[typeof x][x];
}`,
  },
  {
    id: "cabd83e4-34b3-4bea-99ad-90a9feed2f24",
    group: PuzzleGroup.Unknown,
    name: "symmetric",
    source: `function symmetric(x,y) {
  return x == y && y != x;
}`,
  },
  {
    id: "85039e43-e140-4d4b-baa5-0621d1d1febd",
    group: PuzzleGroup.Objects,
    name: "ouroborobj",
    source: `function ouroborobj(x) {
  return x in x;
}`,
  },
  {
    id: "6bea85ae-b82f-4ae6-8584-d38263838c4e",
    group: PuzzleGroup.Unknown,
    name: "truth",
    source: `function truth(x) {
  return x.valueOf() && !x;
}`,
  },
  {
    id: "efde06e1-a758-4f48-9a5e-0edba522926b",
    group: PuzzleGroup.Unknown,
    name: "wat",
    source: `function wat(x) {
  return x('hello') == 'world:)' && !x;
}`,
  },
  {
    id: "ab94fce0-80ef-4cd7-a342-de87e5907ab7",
    group: PuzzleGroup.Eval,
    name: "evil1",
    source: `var eval = window.eval;
function evil1(x) {
  return eval(x+'(x)') && !eval(x)(x);
}`,
  },
  {
    id: "ee2b3b41-997a-451b-95de-151af5d8888e",
    group: PuzzleGroup.Eval,
    name: "evil2",
    source: `var eval = window.eval;
function evil2(x) {
  return eval('('+x+')(x)') && !eval(x)(x);
}`,
  },
  {
    id: "b171cd6c-a81d-4948-ac58-d2e388a6af2f",
    group: PuzzleGroup.Eval,
    name: "evil3",
    source: `var eval = window.eval;
function evil3(parameter) {
  return eval('('+parameter+')(parameter)') &&
        !eval(parameter)(parameter);
}`,
  },
  {
    id: "dbc8185d-00e8-463f-b06e-1055765e24f9",
    group: PuzzleGroup.Random,
    name: "random1",
    source: `function random1(x) {
  return Math.random() in x;
}`,
  },
  {
    id: "ad2e7c7d-645b-41e7-aaab-5f5615526d2c",
    group: PuzzleGroup.Random,
    name: "random2",
    source: `var rand = Math.random();
function random2(x) {
  return rand in x;
}`,
  },
  {
    id: "28a44213-da7d-4693-8ea0-4e4a065883f6",
    group: PuzzleGroup.Random,
    name: "random3",
    source: `var key = crypto.getRandomValues(new Uint32Array(4));
function random3(x) {
  var d = 0;
  for (var i=0; i<key.length; i++) {
    d |= key[i] ^ x[i];
  }
  return d === 0;
}`,
  },
  {
    id: "5b7ba626-fe0c-4983-8ddc-6b52c4188150",
    group: PuzzleGroup.Random,
    name: "random4",
    source: `var rand = Math.random();
function random4(x) {
  return rand === x;
}`,
  },
  {
    id: "8d3af47f-def0-4577-8523-bcf57278d444",
    group: PuzzleGroup.Unknown,
    name: "total",
    source: `function total(x) {
  return (x < x) && (x == x) && (x > x);
}`,
  },
  {
    id: "6debe835-ec34-46f8-8db8-f3d23f503d35",
    group: PuzzleGroup.Unknown,
    name: "json",
    source: `const secrets = new Uint32Array(2);
crypto.getRandomValues(secrets);
const [key, value] = secrets;
const vault = {
  [key]: value
};

function json(x, y) {
  Object.defineProperty(vault, x, { value: y });
  const secure = JSON.stringify(Object.freeze(vault));
  let copy;
  try {
    copy = eval(\`(\${secure})\`);
  } catch (e) {
    // Try again...
    copy = JSON.parse(secure);
    return key in copy && copy[key] !== vault[key];
  }
  return void vault;
}`,
  },
  {
    id: "91d06fc0-43dc-4a14-87d9-0cf9a1db871a",
    group: PuzzleGroup.Unknown,
    name: "countOnMe",
    source: `function countOnMe(x) {
  if (!(x instanceof Array))
    throw 'x must be an array.';

  for (var i = 0; i < 20; i++) {
    if (x[i] != i) {
      throw 'x must contain the numbers 0-19 in order';
    }
  }

  return true;
}`,
  },
  {
    id: "0d1a97ab-5a3c-4ef2-a7a7-a658d0645055",
    group: PuzzleGroup.Unknown,
    name: "countOnMe2",
    source: `function countOnMe2(x) {
  if (!(x instanceof Array))
    throw 'x must be an array.';

  for (var i = 0; i < 1000; i++) {
    if (x[i] !== i) {
      throw 'x must contain the numbers 0-999 in order';
    }
  }

  return true;
}`,
  },
  {
    id: "1db2bf96-55bf-4037-9985-10a909291986",
    group: PuzzleGroup.Unknown,
    name: "countOnMe3",
    source: `function countOnMe3(x) {
  var arrayElements = 1000;

  if (!(x instanceof Array))
    throw 'x must be an Array';

  for (var i = 0; i < arrayElements; i++)
    if (x[i] != i)
      throw 'x must contain the numbers 0-999 in order';

  for (element of x)
    if (element != --arrayElements)
      throw 'x must contain the numbers 999-0 in order';

  if (x.length !== 0)
    throw 'x must be empty';

  return true;
}`,
  },
  {
    id: "a19edcaf-2da3-416b-adb9-ef2e9e077287",
    group: PuzzleGroup.Unknown,
    name: "instance3",
    source: `delete window.Symbol;

function instance3(x) {
  return x && typeof x === 'object' && !(x instanceof Object)
}`,
  },
  {
    id: "94a4e839-0e31-4584-8268-b2220a622cbd",
    group: PuzzleGroup.Unknown,
    name: "letsgo",
    source: `function letsgo(x) {
  let a = let\`abc\`;
  return \`abc\` === a;
}`,
  },
  {
    id: "7ab477e2-a97f-46f1-880a-1acfd1a1f7d9",
    group: PuzzleGroup.Unknown,
    name: "associative",
    source: `function associative(x, y, z) {
  return typeof x === "number"
      && typeof y === "number"
      && typeof z === "number"
      && (x + y) + z !== x + (y + z);
}`,
  },
  {
    id: "e9155316-8322-4ed2-b9e1-2043d1f603bb",
    group: PuzzleGroup.Bases,
    name: "base64",
    source: `verifyInput = input => JSON.parse('[' + input + ']');

const atob = window.atob;
const globalEval = window.eval;

function base64(x, y) {
  if (typeof x !== "string" || typeof y !== "string") { throw "string literals only"; }

  globalEval(x + y);
  if (typeof dmx == "undefined" && typeof Y2K == "undefined") { return false; }

  globalEval(atob(y) + atob(x));
  return dmx.source && Y2K === Infinity
}`,
  },
  {
    id: "ad1eb180-b6a8-4c67-9616-d496482d63c1",
    group: PuzzleGroup.Bases,
    name: "base65",
    source: `verifyInput = input => JSON.parse('[' + input + ']');

const atob = window.atob;
const globalEval = window.eval;

function base65(x, y) {
  if (typeof x !== "string" || typeof y !== "string") { throw "string literals only"; }

  atob(x);
  atob(y);

  window.bullseye = 1;

  globalEval(x + y);
  return whoa === "undefined" && !window.bullseye;
}`,
  },
  {
    id: "4ed93259-5c68-414a-909b-f69f34d107bc",
    group: PuzzleGroup.Bases,
    name: "base66",
    source: `verifyInput = input => JSON.parse('[' + input + ']');

const atob = window.atob;
const globalEval = window.eval;

function base66(x, y) {
  if (typeof x !== "string" || typeof y !== "string") { throw "string literals only"; }

  if (atob(x) !== atob(y)) { return false; }

  window.bullseye = 1;

  globalEval(x + y);
  return wow === "undefined" && !window.bullseye;
}`,
  },
  {
    id: "75a185e6-8f08-48a2-8d13-25bc21ec7fd5",
    group: PuzzleGroup.Unknown,
    name: "decorator",
    source: `function decorator(obj) {
  delete obj.a;
  delete obj.b;
  return obj.a && Object.keys(obj).indexOf('a') == -1
      && !obj.b && Object.keys(obj).indexOf('b') != -1;
}`,
  },
  {
    id: "17410564-09c2-4868-b911-c970b6cf8b12",
    group: PuzzleGroup.Eval,
    name: "e_aluate",
    source: `Object.freeze(RegExp.prototype);

function e_aluate(v) {
  if (v == true) { throw 'input cannot be true'; }
  if (/v/.test(v)) { throw 'input cannot include "v"'; }
  eval(v);
  return v;
}`,
  },
  {
    id: "7a7b7da3-3d67-4999-83a0-1ea8fdf125fc",
    group: PuzzleGroup.Unknown,
    name: "clobber",
    source: `var create = Object.create;
var defineProperty = Object.defineProperty;

function clobber(x, y) {
  if (x !== y) { throw "inputs must be equal"; }

  var o = create(null);
  try {
    defineProperty(o, "nonwritable_prop", { value: x, writable: false, configurable: false });
    defineProperty(o, "nonwritable_prop", { value: y, writable: false, configurable: false });
  } catch (_) {
    return true;
  }

  throw "inputs must raise an error when written in sequence to non-writable property";
}`,
  },
  {
    id: "6e1b874e-5767-45a0-a6aa-255a08cec51e",
    group: PuzzleGroup.Eval,
    name: "typeyTypey",
    source: `verifyInput = input => {
  if (/[;(),]/.test(input)) throw 'Cannot use the following characters: ;(),';
  JSON.parse(input);
}

const ev = window.eval;

function typeyTypey(a) {
  return ev(ev(\`typeof \${a}\`))()
}`,
  },
  {
    id: "dec80091-b0c5-46ad-b379-aeafa99d7a1e",
    group: PuzzleGroup.Random,
    name: "random5",
    source: `const secret = Math.random();
const abs = Math.abs;
const max = Math.max;

function absoluteError(a, b) {
  return abs(a - b);
}
function relativeError(a, b) {
  return absoluteError(a, b) / max(a, b);
}
function random5(x) {
  return absoluteError(x, secret) < 1e-9 || relativeError(x, secret) < 1e-9;
}`,
  },
  {
    id: "0b7e4048-d270-43c1-b2a7-53fbeb2e4338",
    group: PuzzleGroup.Random,
    name: "random6",
    source: `const secret = Math.random();
const abs = Math.abs;

function absoluteError(a, b) {
  return abs(a - b);
}

function random6(x) {
  return absoluteError(x, secret) < 1e-9;
}`,
  },
  {
    id: "796b1904-c8d1-4bb0-bd3a-533607f8255a",
    group: PuzzleGroup.Random,
    name: "random7",
    source: `window.quiteRandomNumber = Math.random();

function random7() {
  const quiteRandomNumber = 4;
  return eval('quiteRandomNumber') === window.quiteRandomNumber;
}`,
  },
  {
    id: "eb801efe-6a02-475e-9497-a246a5362a53",
    group: PuzzleGroup.Random,
    name: "random8",
    source: `window.quiteRandomNumber = Math.random();

function random8() {
  const quiteRandomNumber = 4;
  return eval('quiteRandomNumber') === window.quiteRandomNumber;
}`,
  },
  {
    id: "c977c45f-1162-4698-9d11-27a54ed99172",
    group: PuzzleGroup.Unknown,
    name: "myPlanetNeedsMe",
    source: `const helpfulAdvice = 'This solution does not work!';
const rand = Math.random();
window.ܝ = 065432123456654321234560 * rand;

function myPlanetNeedsMe() {
  answerToLifeTheUniverseAndEverything = 42;

  func = { undefined = !function () { throw helpfulAdvice }(), toString = let\`func\` } =
    function answerToLifeTheUniverseAndEverything() { return 42; };

  return toString != 'undefined' && answerToLifeTheUniverseAndEverything == 493921719446642400000 * rand;
}`,
  },
  {
    id: "e5dfb943-c578-45cf-a134-f0f99bc80846",
    group: PuzzleGroup.Math,
    name: "math",
    source: `function math(x) {
  return x + 0.1 == 0.3;
}`,
  },
  {
    id: "41b531bd-91c0-4751-a982-cbdb871587cf",
    group: PuzzleGroup.Eval,
    name: "invisibleCounter",
    source: `verifyInput = JSON.parse;

const Symbol = window.Symbol;
const eval = window.eval;
const every = Function.call.bind([].every);

function invisibileCounter(x) {
  const o = {};

  const symbols = new Array(5).fill(0).map(_ => Symbol());

  const counters = [
    eval(\`\${x}(symbols[0])\`),
    eval(\`\${x}(symbols[1])()\`),
    eval(\`\${x}(symbols[2])()()\`),
    eval(\`\${x}(symbols[3])()()()\`),
    eval(\`\${x}(symbols[4])()()()()\`)
  ];

  return every(counters, (e, i) => e === undefined && o[symbols[i]] === ++i);
}`,
  },
  {
    id: "a845c1e5-15f0-4d69-93ed-fff91da6a245",
    group: PuzzleGroup.Objects,
    name: "notTooLong",
    source: `const create = Object.create;
const keys = Object.keys;

function notTooLong(x) {
  return create(x).length === 1 &&
    keys(create(x)).length === 0;
}`,
  },
  {
    id: "570726ba-0781-43a1-9cdf-557d367f86be",
    group: PuzzleGroup.Unknown,
    name: "confusedVar",
    source: `function confusedVar(x) {
  return x == !x && x == x;
}`,
  },
  {
    id: "8a057b3d-0bc2-4ba3-9803-81230d2df9a2",
    group: PuzzleGroup.Eval,
    name: "notANaN",
    source: `const isNaN = window.isNaN
const eval = window.eval
const stringify = JSON.stringify

const notANaN = (x, y) => isNaN(x) && isNaN(x(y)) && !isNaN(y) &&
  new x(y) && x(y) &&
  eval(stringify(x(y))) &&
  !eval(stringify(new x(y)));
`,
  },
  {
    id: "46c7cd63-2691-4d47-8195-11d80023c4bf",
    group: PuzzleGroup.Unknown,
    name: "numberFunTime",
    source: `function numberFunTime(x) {
  return x * x === 0 &&
      x + 1 === 1 &&
      x - 1 === -1 &&
      x / x === 1;
}`,
  },
  {
    id: "82261914-7030-461c-af32-691660a036fa",
    group: PuzzleGroup.Unknown,
    name: "andBeyond",
    source: `verifyInput = input => {
  if (/\>/.test(input)) throw 'Use of the greater than symbol is forbidden.';
};

function andBeyond(x) {
  return x() === Number.POSITIVE_INFINITY;
}`,
  },
];

export const puzzlesAsMap = puzzles.reduce<Record<string, Puzzle>>(
  (map, puzzle) => {
    map[puzzle.id] = puzzle;
    return map;
  },
  {},
);

export const puzzlesInGroups = Object.values(PuzzleGroup).reduce(
  (map, group) => {
    map[group] = puzzles.filter((p) => p.group === group);
    return map;
  },
  {} as Record<PuzzleGroup, Puzzle[]>,
);
