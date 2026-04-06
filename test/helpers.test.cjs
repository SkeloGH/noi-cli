"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseCliArgs,
  parseVolumeInput,
  parsePackageJsonVersion,
  isInterruptKey,
} = require("../dist/helpers.js");

test("parseVolumeInput: default", () => {
  assert.equal(parseVolumeInput(undefined), 1);
});

test("parseVolumeInput: valid", () => {
  assert.equal(parseVolumeInput("0.5"), 0.5);
});

test("parseVolumeInput: invalid", () => {
  assert.equal(parseVolumeInput("2"), null);
  assert.equal(parseVolumeInput("nope"), null);
});

test("parsePackageJsonVersion", () => {
  assert.equal(parsePackageJsonVersion('{"version":"1.2.3"}'), "1.2.3");
  assert.equal(parsePackageJsonVersion("{}"), "0.0.0");
});

test("parseCliArgs: version", () => {
  assert.deepEqual(parseCliArgs(["-v"]), { kind: "version" });
  assert.deepEqual(parseCliArgs(["--version"]), { kind: "version" });
});

test("parseCliArgs: run with volume", () => {
  assert.deepEqual(parseCliArgs(["--volume", "0.5"]), {
    kind: "run",
    volume: 0.5,
  });
});

test("parseCliArgs: usage on unknown flag", () => {
  assert.equal(parseCliArgs(["--nope"]).kind, "usage");
});

test("isInterruptKey", () => {
  assert.equal(isInterruptKey("\u0003", undefined), true);
  assert.equal(isInterruptKey("x", { ctrl: true, name: "c" }), true);
  assert.equal(isInterruptKey("x", { name: "up" }), false);
});
