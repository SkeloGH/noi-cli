"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createVolumeLineWriter } = require("../dist/volumeUi.js");

test("writeVolumeLine: first line clears and prints percent", () => {
  const chunks = [];
  const writer = createVolumeLineWriter({
    write: (s) => {
      chunks.push(s);
    },
  });
  writer.writeVolumeLine(0.42);
  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].includes("\r"));
  assert.ok(chunks[0].includes("42%"));
  assert.ok(chunks[0].endsWith("\n"));
});

test("writeVolumeLine: subsequent lines move cursor up", () => {
  const chunks = [];
  const writer = createVolumeLineWriter({
    write: (s) => {
      chunks.push(s);
    },
  });
  writer.writeVolumeLine(0.5);
  writer.writeVolumeLine(0.55);
  assert.equal(chunks.length, 2);
  assert.ok(chunks[1].includes("\x1b[A"));
  assert.ok(chunks[1].includes("55%"));
});
