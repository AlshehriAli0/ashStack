import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { anchor, type Generated, RULES_URL } from "./shared.js";

const headingAnchors = (text: string): Set<string> =>
  new Set(
    text
      .split("\n")
      .filter(line => line.startsWith("#"))
      .map(line => anchor(line.replace(/^#+\s*/, "")))
  );

const RULES_LINK = new RegExp(
  `${RULES_URL.replaceAll(".", "\\.")}((?:RULES|rules/[a-z0-9/-]+)\\.md)(?:#([a-z0-9-]+))?`,
  "g"
);
const ANY_RULES_LINK = /(?:RULES|rules\/[a-z0-9/-]+)\.md#[a-z0-9-]+/g;

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });

interface Link {
  path: string;
  page: string;
  target: string;
}

/**
 * Every rule-doc link the package's own types carry, generated or hand-written.
 * JSDoc cannot interpolate, so each link repeats the base URL; a link that
 * spells the base differently is counted but not returned, and the caller
 * fails on the difference rather than skipping it.
 */
const linksIn = (paths: string[]): { links: Link[]; total: number } => {
  const links: Link[] = [];
  let total = 0;
  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    total += [...text.matchAll(ANY_RULES_LINK)].length;
    for (const [, page = "", target = ""] of text.matchAll(RULES_LINK)) links.push({ path, page, target });
  }
  return { links, total };
};

/** Check editor links against every generated page before writing or checking docs. */
export const validateRuleDocLinks = (pages: Generated[], lintDir: string): void => {
  const anchors = new Map(pages.map(([path, text]) => [relative(lintDir, path), headingAnchors(text)]));
  const { links, total } = linksIn(sources(join(lintDir, "src")));

  if (links.length !== total) {
    console.error(`${total - links.length} rule-doc link(s) do not start with ${RULES_URL} - use that exact base.`);
    process.exit(1);
  }

  const broken = links.filter(
    link => !anchors.has(link.page) || (link.target !== "" && !anchors.get(link.page)?.has(link.target))
  );
  if (broken.length > 0) {
    console.error("Rule-doc links pointing at no page or section:");
    for (const { path, page, target } of broken) console.error(`  - ${page}#${target} in ${path}`);
    process.exit(1);
  }
};
