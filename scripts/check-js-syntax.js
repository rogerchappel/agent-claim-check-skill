import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["bin", "src", "test"];
const files = roots.flatMap((root) => collectJavaScript(root));
if (files.length === 0) {
  console.error("No JavaScript files found in bin, src, or test.");
  process.exit(1);
}

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Syntax check ok (${files.length} JavaScript files).`);

function collectJavaScript(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScript(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}
