import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const documentedInstall = "npm install --global github:rogerchappel/agent-claim-check-skill";
const readme = readFileSync("README.md", "utf8");
assert.match(readme, new RegExp(`^${documentedInstall}$`, "m"));

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8"
});
const [pack] = JSON.parse(output);
const files = new Set(pack.files.map((file) => file.path));

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
  console.error(`Package smoke failed; missing files:\n${missing.join("\n")}`);
  process.exit(1);
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "agent-claim-check-install-"));
const prefix = join(temporaryRoot, "prefix");

try {
  execFileSync("npm", ["install", "--global", "--prefix", prefix, "github:rogerchappel/agent-claim-check-skill"], {
    cwd: temporaryRoot,
    stdio: "pipe"
  });
  const executable = join(prefix, "bin", "agent-claim-check");
  const help = execFileSync(executable, ["--help"], { cwd: temporaryRoot, encoding: "utf8" });
  const version = execFileSync(executable, ["--version"], { cwd: temporaryRoot, encoding: "utf8" });
  assert.match(help, /Usage: agent-claim-check/);
  assert.equal(version.trim(), "0.1.0");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log(`package smoke ok: ${pack.filename} includes ${pack.files.length} files; documented GitHub install passed`);
