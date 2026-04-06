"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  VOLUME_STEP,
  bindStdinKeypress,
} = require("../dist/interactiveVolume.js");

const noopHandlers = {
  isInterruptKey: () => false,
  onInterrupt: () => {},
  onVolumeUp: () => {},
  onVolumeDown: () => {},
};

test("VOLUME_STEP is 5%", () => {
  assert.equal(VOLUME_STEP, 0.05);
});

test("bindStdinKeypress: non-TTY stdin returns noop teardown", () => {
  const stdin = { isTTY: false };
  const teardown = bindStdinKeypress(stdin, noopHandlers);
  assert.equal(typeof teardown, "function");
  teardown();
});
