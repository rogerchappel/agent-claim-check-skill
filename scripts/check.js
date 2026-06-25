import fs from "node:fs";

const required = [
  ".github/workflows/ci.yml",
  "README.md",
  "SKILL.md",
  "docs/PRD.md",
  "docs/TASKS.md",
  "docs/ORCHESTRATION.md",
  "docs/RELEASE_CANDIDATE.md",
  "src/index.js",
  "bin/agent-claim-check.js",
  "fixtures/draft.md",
  "fixtures/sources.json",
  "test/index.test.js"
];

const missing = required.filter((path) => !fs.existsSync(path));
if (missing.length) {
  console.error(`Missing required files:\n${missing.join("\n")}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (!pkg.bin || !pkg.scripts?.smoke || !pkg.scripts?.test) {
  console.error("package.json must expose bin, test, and smoke scripts.");
  process.exit(1);
}

const files = new Set(pkg.files ?? []);
for (const requiredFile of ["bin", "src", "fixtures", "SKILL.md", "README.md", "LICENSE"]) {
  if (!files.has(requiredFile)) {
    console.error(`package.json files must include ${requiredFile}.`);
    process.exit(1);
  }
}

if (pkg.scripts["package:smoke"] !== "node scripts/package-smoke.js") {
  console.error("package:smoke must run scripts/package-smoke.js.");
  process.exit(1);
}

console.log("check ok");
