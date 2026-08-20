#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { checkDraft, readSources, readText, renderJson, renderMarkdown, shouldFail } from "../src/index.js";

function packageVersion() {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  return packageJson.version;
}

function parseArgs(argv) {
  const args = { format: "markdown", failOn: "" };
  const seen = new Set();
  const valueOptions = {
    "--draft": "draft",
    "--sources": "sources",
    "--format": "format",
    "--fail-on": "failOn"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const property = valueOptions[arg];
    if (property) {
      if (seen.has(arg)) throw new Error(`Option ${arg} may only be specified once.`);
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) throw new Error(`Option ${arg} requires a value.`);
      seen.add(arg);
      args[property] = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      if (argv.length !== 1) throw new Error(`Option ${arg} must be used alone.`);
      args.help = true;
    } else if (arg === "--version" || arg === "-v") {
      if (argv.length !== 1) throw new Error(`Option ${arg} must be used alone.`);
      args.version = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function usage() {
  return `Usage: agent-claim-check --draft <file> --sources <file> [--format markdown|json] [--fail-on weak|missing|unverifiable]\n`;
}

function validateArgs(args) {
  if (!new Set(["markdown", "json"]).has(args.format)) {
    throw new Error(`Invalid value for --format: ${args.format}. Expected markdown or json.`);
  }
  if (!new Set(["", "weak", "missing", "unverifiable"]).has(args.failOn)) {
    throw new Error(`Invalid value for --fail-on: ${args.failOn}. Expected weak, missing, or unverifiable.`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.version) {
    process.stdout.write(`${packageVersion()}\n`);
    process.exit(0);
  }
  if (args.help) {
    process.stdout.write(usage());
    process.exit(0);
  }
  validateArgs(args);
  if (!args.draft || !args.sources) {
    throw new Error("Both --draft and --sources are required.");
  }
  const report = checkDraft(readText(args.draft), readSources(args.sources));
  if (args.format === "json") process.stdout.write(renderJson(report));
  else process.stdout.write(renderMarkdown(report));
  process.exit(shouldFail(report, args.failOn) ? 2 : 0);
} catch (error) {
  process.stderr.write(`${error.message}\n${usage()}`);
  process.exit(1);
}
