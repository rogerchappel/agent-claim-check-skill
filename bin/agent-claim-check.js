#!/usr/bin/env node
import { checkDraft, readSources, readText, renderJson, renderMarkdown, shouldFail } from "../src/index.js";

function parseArgs(argv) {
  const args = { format: "markdown", failOn: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--draft") args.draft = argv[++index];
    else if (arg === "--sources") args.sources = argv[++index];
    else if (arg === "--format") args.format = argv[++index];
    else if (arg === "--fail-on") args.failOn = argv[++index];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage: agent-claim-check --draft <file> --sources <file> [--format markdown|json] [--fail-on weak|missing|unverifiable]\n`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    process.exit(0);
  }
  if (!args.draft || !args.sources) {
    throw new Error("Both --draft and --sources are required.");
  }
  const report = checkDraft(readText(args.draft), readSources(args.sources));
  if (args.format === "json") process.stdout.write(renderJson(report));
  else if (args.format === "markdown") process.stdout.write(renderMarkdown(report));
  else throw new Error(`Unknown format: ${args.format}`);
  process.exit(shouldFail(report, args.failOn) ? 2 : 0);
} catch (error) {
  process.stderr.write(`${error.message}\n${usage()}`);
  process.exit(1);
}
