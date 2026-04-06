"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createBrownNoiseState,
  fillPcmSamples,
  MAX_SAMPLE,
} = require("../dist/brownNoise.js");

test("fillPcmSamples: volume 0 yields silence", () => {
  const state = createBrownNoiseState();
  const buf = new Int16Array(64);
  fillPcmSamples(state, buf, 0, () => 0.5);
  assert.deepEqual(Array.from(buf), Array(64).fill(0));
});

test("fillPcmSamples: constant random 0.5 yields zero white → silence", () => {
  const state = createBrownNoiseState();
  const buf = new Int16Array(32);
  fillPcmSamples(state, buf, 1, () => 0.5);
  assert.deepEqual(Array.from(buf), Array(32).fill(0));
});

test("fillPcmSamples: samples stay within digital headroom", () => {
  const state = createBrownNoiseState();
  const buf = new Int16Array(500);
  let n = 0;
  const random = () => {
    const v = (n++ % 5) / 5;
    return v;
  };
  fillPcmSamples(state, buf, 1, random);
  for (let i = 0; i < buf.length; i++) {
    assert.ok(Math.abs(buf[i]) <= MAX_SAMPLE, `sample ${i} out of range`);
  }
});

test("fillPcmSamples: state carries across buffers", () => {
  const state = createBrownNoiseState();
  const a = new Int16Array(4);
  const b = new Int16Array(4);
  let call = 0;
  const random = () => (call++ % 2) * 0.999 + 0.0005;
  fillPcmSamples(state, a, 0.8, random);
  const brownAfterA = state.brown;
  fillPcmSamples(state, b, 0.8, random);
  assert.notEqual(state.brown, brownAfterA);
});
