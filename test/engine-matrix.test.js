import { test } from "node:test";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("release check rejects an engine floor that differs from CI's lowest Node", () => {
  const temp = mkdtempSync(join(tmpdir(), "engine-matrix-"));
  try {
    for (const path of ["scripts/check.js", ".github/workflows/ci.yml", "package.json", "README.md", "SKILL.md", "package-lock.json", "docs/PRD.md", "docs/TASKS.md", "docs/ORCHESTRATION.md", "docs/RELEASE_CANDIDATE.md", "src/index.js", "bin/agent-claim-check.js", "fixtures/draft.md", "fixtures/sources.json", "test/index.test.js"]) {
      const target = join(temp, path);
      cpSync(join(root, path), target, { recursive: true });
    }
    const pkgPath = join(temp, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.engines.node = ">=19";
    writeFileSync(pkgPath, JSON.stringify(pkg));
    const result = execFileSync(process.execPath, ["scripts/check.js"], { cwd: temp, encoding: "utf8", stdio: "pipe" });
    assert.fail(`expected check to fail, got ${result}`);
  } catch (error) {
    assert.match(error.stderr?.toString() ?? "", /engines\.node floor must match/);
    assert.equal(error.status, 1);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
