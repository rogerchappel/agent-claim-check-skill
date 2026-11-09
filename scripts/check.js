import fs from "node:fs";

const required = [
  ".github/workflows/ci.yml",
  "README.md",
  "SKILL.md",
  "package-lock.json",
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
const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
const matrix = workflow.match(/node-version:\s*\n((?:\s+-\s+[^\n]+\n?)+)/);
const versions = matrix?.[1].match(/^\s+-\s+(\d+)\.x\s*$/gm)?.map((line) => Number(line.match(/(\d+)\.x/)[1]));
const engineFloor = pkg.engines?.node?.match(/^>=\s*(\d+)$/)?.[1];
if (!versions?.length || !engineFloor || Number(engineFloor) !== Math.min(...versions)) {
  console.error("package.json engines.node floor must match the lowest Node version in the CI release-check matrix.");
  process.exit(1);
}
if (!pkg.bin || !pkg.scripts?.smoke || !pkg.scripts?.test) {
  console.error("package.json must expose bin, test, and smoke scripts.");
  process.exit(1);
}

const files = new Set(pkg.files ?? []);
for (const requiredFile of [
  "bin", "src", "fixtures", "docs", "SKILL.md", "README.md", "LICENSE",
  "SECURITY.md", "CONTRIBUTING.md", "CHANGELOG.md"
]) {
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
