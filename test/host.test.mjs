// Host half and bundle manifest checks. The host half is intentionally empty:
// all pricing computation happens in the browser with the local clock, so the
// plugin needs no daemon, route, or persisted state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as host from "../lib/index.js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const patch = readFileSync(join(ROOT, "cordis.patch.yml"), "utf8");

test("host half exports the loader identity and applies as a no-op", () => {
  assert.equal(host.name, "dsh-plugin-peak-pricing");
  assert.deepEqual(host.inject, []);
  assert.equal(typeof host.apply, "function");
  assert.equal(host.apply(), undefined);
});

test("package manifest is a 0.2.1 bundle with the client face", () => {
  assert.equal(packageJson.name, "dsh-plugin-peak-pricing");
  assert.equal(packageJson.version, "2.0.1");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.main, "lib/index.js");
  assert.deepEqual(packageJson.dsh.client, {
    platform: "web",
    inject: [],
    immediately: true,
  });
  assert.equal(packageJson.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(packageJson.exports["./client"].default, "./lib/client.js");
  assert.equal(packageJson.exports["./cordis.patch.yml"], "./cordis.patch.yml");
  assert.equal(packageJson.exports["./package.json"], "./package.json");
  assert.ok(packageJson.files.includes("cordis.patch.yml"));
  assert.ok(packageJson.files.includes("lib/client.js"));
  assert.equal(packageJson.scripts.test, "node --test");
});

test("bundle patch inserts the same id/name as the package", () => {
  assert.match(patch, /- insert:/);
  assert.match(patch, /id: dsh-plugin-peak-pricing/);
  assert.match(patch, /name: 'dsh-plugin-peak-pricing'/);
});
