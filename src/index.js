import fs from "node:fs";

const STATUS_RANK = {
  supported: 0,
  weak: 1,
  missing: 2,
  unverifiable: 3
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "being",
  "between",
  "could",
  "every",
  "from",
  "have",
  "into",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "with",
  "would",
  "your"
]);

const NEGATION_PATTERN = /\b(?:cannot|neither|never|no|nor|not|without)\b|\b\w+n['’]t\b/i;

export function readText(path) {
  return fs.readFileSync(path, "utf8");
}

export function readSources(path) {
  const parsed = JSON.parse(readText(path));
  if (!Array.isArray(parsed)) {
    throw new Error("Source bundle must be a JSON array.");
  }
  const ids = new Set();
  return parsed.map((source, index) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new Error(`Source ${index} must be an object.`);
    }
    for (const field of ["id", "text"]) {
      if (typeof source[field] !== "string" || source[field].trim() === "") {
        throw new Error(`Source ${index} field ${field} must be a non-blank string.`);
      }
    }
    for (const field of ["title", "url"]) {
      if (source[field] !== undefined && typeof source[field] !== "string") {
        throw new Error(`Source ${index} field ${field} must be a string when provided.`);
      }
    }
    if (ids.has(source.id)) {
      throw new Error(`Source ${index} field id duplicates source id ${JSON.stringify(source.id)}.`);
    }
    ids.add(source.id);
    return {
      id: source.id,
      title: source.title || source.id,
      url: source.url || "",
      text: source.text
    };
  });
}

function stripFencedCode(lines) {
  const content = [];
  let fence = null;

  for (const line of lines) {
    if (fence) {
      const closing = line.match(/^[ \t]{0,3}([`~]{3,})[ \t]*$/);
      if (closing && closing[1][0] === fence.marker && closing[1].length >= fence.length) {
        fence = null;
      }
      content.push("");
      continue;
    }

    const opening = line.match(/^[ \t]{0,3}([`~]{3,})(.*)$/);
    if (opening && !opening[1].includes(opening[1][0] === "`" ? "~" : "`")) {
      const marker = opening[1][0];
      const isSingleMarkerRun = [...opening[1]].every((character) => character === marker);
      const validInfoString = marker === "~" || !opening[2].includes("`");
      if (isSingleMarkerRun && validInfoString) {
        fence = { marker, length: opening[1].length };
        content.push("");
        continue;
      }
    }

    content.push(line);
  }

  return content;
}

export function extractClaims(markdown) {
  const structuralMarkdown = markdown.replace(/<!--[\s\S]*?-->/g, " ");
  const lines = stripFencedCode(structuralMarkdown
    .split("\n")
    .map((line) => line.replace(/^[ \t]{0,3}>[ \t]?/, "")))
    .map((line) => line.replace(/`[^`]+`/g, " "));
  const contentLines = [];
  const tableLines = new Set();

  for (let index = 1; index < lines.length; index += 1) {
    if (/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$/.test(lines[index])) {
      tableLines.add(index - 1);
      tableLines.add(index);
      for (let row = index + 1; row < lines.length && lines[row].includes("|"); row += 1) {
        tableLines.add(row);
      }
    }
  }

  for (const [index, line] of lines.entries()) {
    if (tableLines.has(index) || /^[ \t]{0,3}\[[^\]]+\]:[ \t]*\S+/.test(line)) {
      contentLines.push("");
      continue;
    }
    if (/^(?: {4,}|\t)/.test(line)) {
      contentLines.push("");
      continue;
    }
    if (/^[ \t]{0,3}(?:=+|-+)[ \t]*$/.test(line) && contentLines.at(-1)?.trim()) {
      contentLines[contentLines.length - 1] = "";
      contentLines.push("");
      continue;
    }
    contentLines.push(line);
  }

  return contentLines
    .join("\n")
    .replace(/^[ \t]{0,3}#{1,6}(?:[ \t]+.*|[ \t]*)$/gm, "\n\n")
    .replace(/^[ \t]{0,3}(?:[-+*]|\d{1,9}[.)])[ \t]+/gm, "\n\n")
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 24)
    .filter((sentence) => /[a-zA-Z]/.test(sentence))
    .map((text, index) => ({ id: `C${index + 1}`, text }));
}

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[-\u2010-\u2015]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3)
    .filter((token) => !STOP_WORDS.has(token));
}

function hasNegation(text) {
  return NEGATION_PATTERN.test(text);
}

function polarityTokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .filter((token) => !STOP_WORDS.has(token) && !hasNegation(token))
    .map((token) => token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token);
}

function hasMatchedNegation(text, referenceText) {
  const clauses = String(text)
    .split(/[,;:]\s*(?:but|yet|while|although|however)?\s*|\s+\b(?:but|yet|while|although|however)\b\s+/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const terms = new Set(polarityTokens(referenceText));
  const ranked = clauses
    .map((clause, index) => {
      const tokens = polarityTokens(clause);
      const overlap = tokens.filter((token) => terms.has(token)).length;
      return { clause, index, relevance: tokens.length ? overlap / tokens.length : 0, overlap };
    })
    .sort((left, right) =>
      right.relevance - left.relevance || right.overlap - left.overlap || left.index - right.index
    );
  return hasNegation(ranked[0]?.clause ?? text);
}

function splitPassages(source) {
  const passages = String(source.text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((passage) => passage.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const title = String(source.title ?? "").trim();
  return title && title !== source.id ? [title, ...passages] : passages;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareMatches(left, right) {
  return (
    right.score - left.score ||
    Number(left.negationMismatch) - Number(right.negationMismatch) ||
    compareText(left.source.id, right.source.id) ||
    compareText(left.passage, right.passage) ||
    compareText(left.source.title, right.source.title) ||
    compareText(left.source.url, right.source.url)
  );
}

export function classifyClaim(claim, sources) {
  const claimTokens = new Set(tokenize(claim.text));
  if (claimTokens.size === 0) {
    return {
      ...claim,
      status: "unverifiable",
      evidence: [],
      reason: "No stable claim terms were found.",
      suggestion: "Rewrite with concrete, source-backed details."
    };
  }

  const matches = sources
    .flatMap((source) =>
      splitPassages(source).map((passage) => {
        const passageTokens = new Set(tokenize(passage));
        const overlap = [...claimTokens].filter((token) => passageTokens.has(token));
        return {
          source,
          passage,
          overlap,
          score: overlap.length / claimTokens.size,
          negationMismatch:
            hasMatchedNegation(claim.text, passage) !== hasMatchedNegation(passage, claim.text)
        };
      })
    )
    .filter((match) => match.overlap.length > 0)
    .sort(compareMatches);

  const best = matches[0];
  if (!best) {
    return {
      ...claim,
      status: "missing",
      evidence: [],
      reason: "No overlapping evidence terms were found in the source bundle.",
      suggestion: "Remove the claim or add a source that directly supports it."
    };
  }

  const status =
    best.score >= 0.65 && !best.negationMismatch
      ? "supported"
      : best.score >= 0.35
        ? "weak"
        : "missing";
  return {
    ...claim,
    status,
    evidence: matches.slice(0, 3).map((match) => ({
      id: match.source.id,
      title: match.source.title,
      url: match.source.url,
      passage: match.passage,
      overlap: match.overlap
    })),
    reason:
      best.negationMismatch
        ? "The claim and strongest matched passage use opposite negation polarity."
        : status === "supported"
        ? "The claim has strong lexical overlap with supplied evidence."
        : status === "weak"
          ? "The claim has partial evidence but may need narrower wording."
          : "Only minimal evidence overlap was found.",
    suggestion:
      best.negationMismatch
        ? "Rewrite the claim to match the evidence or add evidence for the negated statement."
        : status === "supported"
        ? "Keep the claim with a citation."
        : status === "weak"
          ? "Narrow the wording or cite the exact supporting source."
          : "Add direct evidence or remove the claim."
  };
}

export function checkDraft(markdown, sources) {
  const claims = extractClaims(markdown);
  const results = claims.length
    ? claims.map((claim) => classifyClaim(claim, sources))
    : [{
        id: "C0",
        text: "No verifiable claims were extracted from the draft.",
        status: "unverifiable",
        evidence: [],
        reason: "The draft did not contain any claim candidates.",
        suggestion: "Add at least one concrete, source-backed prose or list claim."
      }];
  const summary = results.reduce(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    { supported: 0, weak: 0, missing: 0, unverifiable: 0 }
  );
  return { summary, results };
}

export function shouldFail(report, failOn = "") {
  if (!failOn) return false;
  const threshold = STATUS_RANK[failOn];
  if (threshold === undefined) {
    throw new Error(`Unknown fail-on policy: ${failOn}`);
  }
  return report.results.some((result) => STATUS_RANK[result.status] >= threshold);
}

export function renderMarkdown(report) {
  const lines = [
    "# Claim Check Report",
    "",
    `Supported: ${report.summary.supported}`,
    `Weak: ${report.summary.weak}`,
    `Missing: ${report.summary.missing}`,
    `Unverifiable: ${report.summary.unverifiable}`,
    "",
    "| ID | Status | Claim | Evidence | Suggestion |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const result of report.results) {
    const evidence = result.evidence.length
      ? result.evidence.map((item) => item.id).join(", ")
      : "none";
    lines.push(
      `| ${result.id} | ${result.status} | ${escapeTable(result.text)} | ${escapeTable(evidence)} | ${escapeTable(result.suggestion)} |`
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderJson(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
