const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function requireTs(tsPath) {
  const source = fs.readFileSync(tsPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: tsPath,
  });

  const mod = new Module(tsPath, module.parent);
  mod.filename = tsPath;
  mod.paths = Module._nodeModulePaths(path.dirname(tsPath));
  mod._compile(output.outputText, tsPath);
  return mod.exports;
}

const boardTexturePath = path.resolve(__dirname, "../src/lib/poker/boardTexture.ts");
const { analyzeBoardTexture } = requireTs(boardTexturePath);

function c(rank, suit) {
  return { rank, suit };
}

const cases = [
  {
    name: "empty board",
    board: [],
    expect: { texture: "dry", isDry: true, isWet: false },
  },
  {
    name: "monotone flop",
    board: [c("A", "s"), c("K", "s"), c("7", "s")],
    expect: { texture: "monotone", isMonotone: true, hasFlushDraw: true, isWet: true },
  },
  {
    name: "paired flop",
    board: [c("A", "h"), c("A", "d"), c("7", "s")],
    expect: { texture: "paired", isPaired: true },
  },
  {
    name: "connected flop",
    board: [c("9", "h"), c("8", "d"), c("7", "s")],
    expect: { texture: "connected", hasStraightDraw: true, isWet: true },
  },
  {
    name: "semi-wet flop",
    board: [c("K", "h"), c("9", "h"), c("2", "d")],
    expect: { texture: "semi_wet", hasFlushDraw: true, isWet: true },
  },
  {
    name: "dry flop",
    board: [c("K", "c"), c("9", "d"), c("3", "s")],
    expect: { texture: "dry", isDry: true, hasFlushDraw: false, hasStraightDraw: false },
  },
];

for (const testCase of cases) {
  const result = analyzeBoardTexture(testCase.board);
  for (const [key, value] of Object.entries(testCase.expect)) {
    assert.equal(
      result[key],
      value,
      `${testCase.name}: expected ${key} to be ${String(value)} but got ${String(result[key])}`
    );
  }
}

console.log("✓ boardTexture tests passed");
