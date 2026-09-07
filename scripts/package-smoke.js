import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const documentedInstall = "npm install --global github:rogerchappel/agent-claim-check-skill";
const readme = readFileSync("README.md", "utf8");
assert.match(readme, new RegExp(`^${documentedInstall}$`, "m"));

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const temporaryRoot = mkdtempSync(join(tmpdir(), "agent-claim-check-package-smoke-"));
const packDirectory = join(temporaryRoot, "pack");
const prefix = join(temporaryRoot, "prefix");
mkdirSync(packDirectory);

try {
  const output = execFileSync("npm", ["pack", "--json", "--pack-destination", packDirectory], {
    encoding: "utf8"
  });
  const [pack] = JSON.parse(output);
  const files = new Set(pack.files.map((file) => file.path));
  const tarballPath = join(packDirectory, pack.filename);

  const required = [
    "bin/agent-claim-check.js",
    "src/index.js",
    "fixtures/draft.md",
    "fixtures/sources.json",
    "SKILL.md",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md"
  ];

  const missing = required.filter((file) => !files.has(file));
  if (missing.length) {
    throw new Error(`Package smoke failed; missing files:\n${missing.join("\n")}`);
  }

  execFileSync("npm", ["install", "--global", "--prefix", prefix, tarballPath], {
    cwd: temporaryRoot,
    stdio: "pipe"
  });
  const executable = join(prefix, "bin", "agent-claim-check");
  const help = execFileSync(executable, ["--help"], { cwd: temporaryRoot, encoding: "utf8" });
  const version = execFileSync(executable, ["--version"], { cwd: temporaryRoot, encoding: "utf8" });
  assert.match(help, /Usage: agent-claim-check/);
  assert.equal(version.trim(), pkg.version);

  console.log(`package smoke ok: installed ${pack.filename} with ${pack.files.length} files; CLI help and version passed`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
