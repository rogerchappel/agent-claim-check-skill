import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("../scripts/package-smoke.js", import.meta.url), "utf8");

describe("package smoke contract", () => {
  it("installs the generated tarball rather than a repository reference", () => {
    assert.match(source, /const tarballPath = join\(packDirectory, pack\.filename\)/);
    assert.match(source, /\["install", "--global", "--prefix", prefix, tarballPath\]/);
    assert.doesNotMatch(source, /\["install"[^\n]+github:/);
  });

  it("checks the installed CLI version against package metadata", () => {
    assert.match(source, /assert\.equal\(version\.trim\(\), pkg\.version\)/);
    assert.doesNotMatch(source, /assert\.equal\(version\.trim\(\), "\d+\.\d+\.\d+"\)/);
  });
});
