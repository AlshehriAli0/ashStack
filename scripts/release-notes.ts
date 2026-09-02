import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");

/** Publishable packages, by the directory they live in under `packages/`. */
const DIRS = ["lint", "fmt"] as const;

export type Dir = (typeof DIRS)[number];
export type Area = Dir | "shared";

const npmName = (dir: Dir): string => `@ashstack/${dir}`;

/** Conventional-commit types worth a reader's time, in the order they appear. */
const SECTIONS: [type: string, heading: string][] = [
  ["feat", "Features"],
  ["fix", "Bug Fixes"],
  ["perf", "Performance"],
];

const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<breaking>!)?: (?<subject>.+)$/;

const RECORD = "\u001e";
const FIELD = "\u001f";

export interface Entry {
  sha: string;
  type: string;
  subject: string;
  area: Area;
  breaking: boolean;
}

export interface RawCommit {
  sha: string;
  subject: string;
  body: string;
  files: string[];
}

/**
 * Which package a commit belongs to, from the files it touched rather than the
 * scope its message claims. Anything outside one package alone — both of them,
 * or the root, scripts and workflows — is shared.
 */
export const areaOf = (files: string[]): Area => {
  const lint = files.some(file => file.startsWith("packages/lint/"));
  const fmt = files.some(file => file.startsWith("packages/fmt/"));
  if (lint && !fmt) return "lint";
  if (fmt && !lint) return "fmt";
  return "shared";
};

export const parseCommit = ({ sha, subject, body, files }: RawCommit): Entry | null => {
  const matched = CONVENTIONAL.exec(subject)?.groups;
  if (!matched?.type || !matched.subject) return null;
  return {
    sha: sha.slice(0, 7),
    type: matched.type,
    subject: matched.subject,
    area: areaOf(files),
    breaking: matched.breaking === "!" || body.includes("BREAKING CHANGE"),
  };
};

const bullet = (entry: Entry, dir: Dir, commitUrl: string): string => {
  const label = entry.area === dir ? "" : `**${entry.area}:** `;
  return `- ${label}${entry.subject} ([\`${entry.sha}\`](${commitUrl}/${entry.sha}))`;
};

const block = (heading: string, bullets: string[]): string[] =>
  bullets.length === 0 ? [] : [`### ${heading}\n\n${bullets.join("\n")}\n`];

export interface Release {
  version: string;
  date: string;
  dir: Dir;
  commitUrl: string;
}

/**
 * A package's changelog entry: breaking changes first, then the sections a
 * reader cares about. A release whose commits are all chores still lists them,
 * under `Other Changes`, rather than showing a version with nothing under it.
 */
export const renderNotes = (entries: Entry[], into: Release): string => {
  const { version, date, dir, commitUrl } = into;
  const mine = entries.filter(entry => entry.area === dir || entry.area === "shared");
  const listed = (predicate: (entry: Entry) => boolean): string[] =>
    mine.filter(predicate).map(entry => bullet(entry, dir, commitUrl));

  const graded = new Set(SECTIONS.map(([type]) => type));
  const grouped = (heading: string, predicate: (entry: Entry) => boolean): string[] =>
    block(heading, listed(predicate));

  const blocks = [
    ...grouped("Breaking Changes", entry => entry.breaking),
    ...SECTIONS.flatMap(([type, heading]) => grouped(heading, entry => entry.type === type && !entry.breaking)),
  ];
  const body = blocks.length > 0 ? blocks : grouped("Other Changes", entry => !graded.has(entry.type));

  return `## ${version} (${date})\n\n${body.join("\n")}`;
};

/** Insert a new entry above the newest one, keeping the file's title in place. */
export const withNotes = (changelog: string, notes: string): string => {
  const at = changelog.indexOf("\n## ");
  if (at === -1) return `${changelog.trimEnd()}\n\n${notes}`;
  return `${changelog.slice(0, at + 1)}${notes}\n${changelog.slice(at + 1)}`;
};

/** `git+https://github.com/o/r.git` reads as `https://github.com/o/r/commit`. */
export const commitUrlOf = (repositoryUrl: string): string =>
  `${repositoryUrl.replace(/^git\+/, "").replace(/\.git$/, "")}/commit`;

const git = (...args: string[]): string =>
  Bun.spawnSync(["git", ...args], { cwd: repoRoot })
    .stdout.toString()
    .trim();

/** A shallow checkout sees one commit and no tags, which would read as a release of one commit. */
const assertFullHistory = (): void => {
  if (git("rev-parse", "--is-shallow-repository") !== "false") {
    throw new Error("Shallow clone: the notes would miss every commit but the last. Check out with fetch-depth: 0.");
  }
};

const lastTag = (dir: Dir): string =>
  git("tag", "--list", `${npmName(dir)}@*`, "--sort=-version:refname").split("\n")[0] ?? "";

const commitsSince = (tag: string): Entry[] =>
  git("log", `--format=%H${FIELD}%s${FIELD}%b${RECORD}`, tag === "" ? "HEAD" : `${tag}..HEAD`)
    .split(RECORD)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk !== "")
    .flatMap(chunk => {
      const [sha = "", subject = "", body = ""] = chunk.split(FIELD);
      const files = git("show", "--name-only", "--format=", sha).split("\n").filter(Boolean);
      return parseCommit({ sha, subject, body, files }) ?? [];
    });

interface PackageJson {
  version: string;
  repository?: { url?: string };
}

const packageJson = (dir: Dir): PackageJson =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  JSON.parse(readFileSync(join(repoRoot, "packages", dir, "package.json"), "utf8")) as PackageJson;

/**
 * Writing the files is the script's job, not the module's: tests import the
 * pure parts. The notes go to stderr to be read in the job log; stdout is the
 * one-line `name@version` list, which the release commit uses as its subject.
 */
const main = (requested: string): void => {
  assertFullHistory();
  const asked = requested.split(",");
  const date = new Date().toISOString().slice(0, 10);
  const released: string[] = [];

  for (const dir of DIRS.filter(name => asked.includes("both") || asked.includes(name))) {
    const { version, repository } = packageJson(dir);
    const commitUrl = commitUrlOf(repository?.url ?? "");
    const notes = renderNotes(commitsSince(lastTag(dir)), { version, date, dir, commitUrl });
    const path = join(repoRoot, "packages", dir, "CHANGELOG.md");
    writeFileSync(path, withNotes(readFileSync(path, "utf8"), notes));
    released.push(`${npmName(dir)}@${version}`);
    console.error(notes);
  }

  console.log(released.join(" "));
};

if (import.meta.main) main(process.argv[2] ?? "both");
