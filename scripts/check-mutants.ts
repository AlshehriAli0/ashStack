import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const distRoot = join(repoRoot, "packages", "lint", "dist");
const testsRoot = join(repoRoot, "tests");
const allowPath = join(testsRoot, "surviving-mutants.json");

const argument = (flag: string): string | undefined =>
  process.argv.find(value => value.startsWith(`${flag}=`))?.slice(flag.length + 1);

const only = argument("--module");

/**
 * Quarter of the cores by default. A sweep is over a thousand test runs, each
 * spawning oxlint, and it should leave the machine usable; CI raises it with
 * `--workers` and splits the queue with `--shard`.
 */
const workers = Number(argument("--workers") ?? Math.max(1, Math.floor(availableParallelism() / 4)));

/** `--shard=2/4` runs the second quarter, so CI can spread the sweep across jobs. */
const [shardIndex = 1, shardCount = 1] = (argument("--shard") ?? "1/1").split("/").map(Number);

/** A mutant that loops forever counts as killed: the tests never came back green. */
const RUN_TIMEOUT = 60_000;

/**
 * A swap that changes behaviour without changing shape. Applied one at a time
 * to the compiled rule, never to source, so no rebuild sits in the loop.
 */
const OPERATORS: [from: string, to: string][] = [
  ["===", "!=="],
  ["!==", "==="],
  ["&&", "||"],
  ["||", "&&"],
  [">=", ">"],
  ["<=", "<"],
  [">", ">="],
  ["<", "<="],
  ["true", "false"],
  ["false", "true"],
];

interface Mutant {
  file: string;
  offset: number;
  line: number;
  from: string;
  to: string;
}

/** Offset just past the comment starting at `index`, or -1 when none starts there. */
const endOfComment = (source: string, index: number): number => {
  const opener = source.slice(index, index + 2);
  if (opener === "//") {
    const end = source.indexOf("\n", index);
    return end === -1 ? source.length : end;
  }
  if (opener !== "/*") return -1;
  const end = source.indexOf("*/", index + 2);
  return end === -1 ? source.length : end + 2;
};

/** Offset just past the string or template starting at `index`, or -1 when none starts there. */
const endOfString = (source: string, index: number): number => {
  const quote = source.charAt(index);
  if (quote !== '"' && quote !== "'" && quote !== "`") return -1;
  let at = index + 1;
  while (at < source.length && source.charAt(at) !== quote) at += source.charAt(at) === "\\" ? 2 : 1;
  return at + 1;
};

/**
 * Offsets of real code in a compiled module: everything outside strings,
 * templates and comments. Diagnostic messages are full of `&&` and `>`;
 * mutating those would report on prose rather than logic.
 */
const codeOffsets = (source: string): Set<number> => {
  const offsets = new Set<number>();
  let index = 0;
  while (index < source.length) {
    const skipped = Math.max(endOfComment(source, index), endOfString(source, index));
    if (skipped > index) {
      index = skipped;
      continue;
    }
    offsets.add(index);
    index += 1;
  }
  return offsets;
};

const isWordChar = (char: string): boolean => /[\w$]/.test(char);

const lineOf = (source: string, offset: number): number => {
  let line = 1;
  for (let at = source.indexOf("\n"); at !== -1 && at < offset; at = source.indexOf("\n", at + 1)) line += 1;
  return line;
};

const mutantsIn = (file: string, source: string): Mutant[] => {
  const code = codeOffsets(source);
  const found: Mutant[] = [];

  for (const [from, to] of OPERATORS) {
    const wholeWord = /^\w/.test(from);
    for (let offset = source.indexOf(from); offset !== -1; offset = source.indexOf(from, offset + 1)) {
      if (!code.has(offset)) continue;
      if (wholeWord && (isWordChar(source.charAt(offset - 1)) || isWordChar(source.charAt(offset + from.length)))) {
        continue;
      }
      if (found.some(other => other.offset <= offset && offset < other.offset + other.from.length)) continue;
      found.push({ file, offset, line: lineOf(source, offset), from, to });
    }
  }
  return found.toSorted((a, b) => a.offset - b.offset);
};

const jsFilesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return jsFilesUnder(join(dir, entry.name));
    return entry.name.endsWith(".js") ? [join(dir, entry.name)] : [];
  });

const ENTRY_TESTS = ["entries.test.ts", "compose.test.ts"];

/** Which test files could possibly see a change in this compiled file. */
const testsFor = (file: string): string[] => {
  const parts = file.split(sep);
  const rulesAt = parts.indexOf("rules");
  if (rulesAt !== -1) return [`${parts[rulesAt + 1]}.test.ts`, ...(parts.at(-1) === "index.js" ? ENTRY_TESTS : [])];
  if (file.endsWith(join("react-native", "stylesheet.js"))) {
    return ["stylesheet.test.ts", "unistyles.test.ts", "legend-list.test.ts"];
  }
  if (file.endsWith(join("lib", "ast.js"))) return ["ast.test.ts", "stylesheet.test.ts"];
  if (file.endsWith(join("lib", "detect.js"))) return ["detect.test.ts", "compose.test.ts"];
  return ENTRY_TESTS;
};

const present = new Set(readdirSync(testsRoot));

const targets = jsFilesUnder(distRoot)
  .map(file => ({ file, tests: testsFor(relative(distRoot, file)).filter(name => present.has(name)) }))
  .filter(target => target.tests.length > 0)
  .filter(target => only === undefined || target.file.includes(only));

const queue = targets
  .flatMap(({ file, tests }) =>
    mutantsIn(relative(distRoot, file), readFileSync(file, "utf8")).map(mutant => ({ mutant, tests }))
  )
  .filter((_, index) => index % shardCount === shardIndex - 1);

if (queue.length === 0) {
  console.error(`no mutants to run${only === undefined ? "" : ` for --module=${only}`}`);
  process.exit(1);
}

const sandbox = (index: number): string => {
  const dir = mkdtempSync(join(tmpdir(), `ashstack-mutant-${index}-`));
  cpSync(distRoot, join(dir, "packages", "lint", "dist"), { recursive: true });
  cpSync(testsRoot, join(dir, "tests"), { recursive: true });
  symlinkSync(join(repoRoot, "node_modules"), join(dir, "node_modules"), "dir");
  symlinkSync(join(repoRoot, "packages", "lint", "fixtures"), join(dir, "packages", "lint", "fixtures"), "dir");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "mutant-sandbox", private: true, type: "module" }));
  return dir;
};

const survives = async (dir: string, { mutant, tests }: (typeof queue)[number]): Promise<boolean> => {
  const path = join(dir, "packages", "lint", "dist", mutant.file);
  const original = readFileSync(path, "utf8");
  writeFileSync(
    path,
    original.slice(0, mutant.offset) + mutant.to + original.slice(mutant.offset + mutant.from.length)
  );
  try {
    const run = Bun.spawn(["bun", "test", ...tests.map(name => join("tests", name))], {
      cwd: dir,
      stdout: "ignore",
      stderr: "ignore",
      timeout: RUN_TIMEOUT,
      killSignal: "SIGKILL",
    });
    return (await run.exited) === 0;
  } finally {
    writeFileSync(path, original);
  }
};

const allowed = new Set<string>(JSON.parse(readFileSync(allowPath, "utf8")).equivalent);
const key = (mutant: Mutant): string => `${mutant.file}:${mutant.line} ${mutant.from} -> ${mutant.to}`;

const survivors: Mutant[] = [];
let done = 0;
let cursor = 0;

const drain = async (dir: string): Promise<void> => {
  for (let next = cursor++; next < queue.length; next = cursor++) {
    const item = queue[next];
    if (!item) break;
    // oxlint-disable-next-line eslint/no-await-in-loop
    const survived = await survives(dir, item);
    if (survived) survivors.push(item.mutant);
    done += 1;
    if (done % 50 === 0) process.stderr.write(`  ${done}/${queue.length}, ${survivors.length} surviving\n`);
  }
};

const dirs = Array.from({ length: Math.min(workers, queue.length) }, (_, index) => sandbox(index));
try {
  await Promise.all(dirs.map(dir => drain(dir)));
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}

const unexpected = survivors.filter(mutant => !allowed.has(key(mutant)));
const score = (((queue.length - survivors.length) / queue.length) * 100).toFixed(1);

if (unexpected.length > 0) {
  const listed = unexpected
    .map(mutant => `  - ${key(mutant)}`)
    .toSorted()
    .join("\n");
  console.error(
    `MUTANTS SURVIVED (${unexpected.length} of ${queue.length}, ${score}% killed):\n${listed}\n\n` +
      `Each line is a change to the compiled rule that no test noticed. Add a case that fails under it, ` +
      `or, if the change cannot alter behaviour, add the line to tests/surviving-mutants.json.`
  );
  process.exit(1);
}
const shard = shardCount === 1 ? "" : ` (shard ${shardIndex}/${shardCount})`;
console.log(`mutants ok${shard}: ${queue.length} applied, ${score}% killed, ${allowed.size} known equivalent`);
