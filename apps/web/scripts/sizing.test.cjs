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

const sizingPath = path.resolve(__dirname, "../src/lib/poker/sizing.ts");
const {
  clamp,
  roundToHalf,
  getOpenRaiseSize,
  getThreeBetSize,
  getFourBetSize,
} = requireTs(sizingPath);

function approx(actual, expected, epsilon = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

// roundToHalf
approx(roundToHalf(2.24), 2.0);
approx(roundToHalf(2.25), 2.5);
approx(roundToHalf(2.74), 2.5);

// clamp
assert.equal(clamp(1, 2, 3), 2);
assert.equal(clamp(2.5, 2, 3), 2.5);
assert.equal(clamp(5, 2, 3), 3);

// getOpenRaiseSize
const profile = { aggression: 0.5 };
approx(getOpenRaiseSize("UTG", 15, profile), 2.0);
approx(getOpenRaiseSize("SB", 15, profile), 2.3);
approx(getOpenRaiseSize("UTG", 150, profile), 2.7);

const aggressiveProfile = { aggression: 1.0 };
approx(getOpenRaiseSize("UTG", 100, aggressiveProfile), 2.75); // 2.5 * 1.1

// getThreeBetSize
approx(getThreeBetSize(2.5, true, 100), 7.5);
approx(getThreeBetSize(2.5, false, 100), 8.75);
approx(getThreeBetSize(2.5, true, 20), 6.5);
approx(getThreeBetSize(2.5, false, 20), 7.5);
approx(getThreeBetSize(2.5, true, 150), 8.75);
approx(getThreeBetSize(2.5, false, 150), 10.0);

// getFourBetSize
approx(getFourBetSize(8.0, true, 30), 16.8); // 8.0 * 2.1
approx(getFourBetSize(8.0, false, 30), 16.8); // 8.0 * 2.1
approx(getFourBetSize(8.0, true, 100), 17.6); // 8.0 * 2.2
approx(getFourBetSize(8.0, false, 100), 19.2); // 8.0 * 2.4
approx(getFourBetSize(8.0, true, 150), 18.4); // 8.0 * 2.3
approx(getFourBetSize(8.0, false, 150), 20.0); // 8.0 * 2.5

console.log("✓ sizing tests passed");
