import { describe, expect, it } from "bun:test";

import {
  type Entry,
  type Release,
  areaOf,
  commitUrlOf,
  parseCommit,
  renderNotes,
  withNotes,
} from "../scripts/release-notes.js";

const URL = "https://github.com/AlshehriAli0/ashStack/commit";

const into = (version: string): Release => ({ version, date: "2026-09-02", dir: "lint", commitUrl: URL });

const entry = (over: Partial<Entry> = {}): Entry => ({
  sha: "abc1234",
  type: "feat",
  subject: "do the thing",
  area: "lint",
  breaking: false,
  ...over,
});

describe("areaOf", () => {
  it("reads one package's files as that package", () => {
    expect(areaOf(["packages/lint/src/index.ts"])).toBe("lint");
    expect(areaOf(["packages/fmt/oxfmt.json"])).toBe("fmt");
  });

  it("reads both packages as shared", () => {
    expect(areaOf(["packages/lint/src/index.ts", "packages/fmt/oxfmt.json"])).toBe("shared");
  });

  it("reads the root, scripts and workflows as shared", () => {
    expect(areaOf([".github/workflows/release.yml", "scripts/check-pack.ts"])).toBe("shared");
    expect(areaOf([])).toBe("shared");
  });
});

describe("parseCommit", () => {
  const raw = { sha: "5f7c58e1234", subject: "feat(lint): add a rule", body: "", files: ["packages/lint/src/a.ts"] };

  it("takes the type and subject, and shortens the sha", () => {
    expect(parseCommit(raw)).toEqual({
      sha: "5f7c58e",
      type: "feat",
      subject: "add a rule",
      area: "lint",
      breaking: false,
    });
  });

  it("skips a commit that is not conventional", () => {
    expect(parseCommit({ ...raw, subject: "Update README.md" })).toBeNull();
  });

  it("reads a bang and a body trailer as breaking", () => {
    expect(parseCommit({ ...raw, subject: "feat(lint)!: drop the option" })?.breaking).toBe(true);
    expect(parseCommit({ ...raw, body: "BREAKING CHANGE: the option is gone" })?.breaking).toBe(true);
  });

  it("takes the area from the files, not the scope the message claims", () => {
    expect(parseCommit({ ...raw, subject: "feat(fmt): add a rule" })?.area).toBe("lint");
  });
});

describe("renderNotes", () => {
  it("groups by type, in section order, with linked shas", () => {
    const notes = renderNotes(
      [
        entry({ type: "perf", subject: "minify the dist", sha: "e5a4c2e" }),
        entry({ type: "feat", subject: "add a rule", sha: "5f7c58e" }),
        entry({ type: "fix", subject: "allow a bare return", sha: "9a5f019" }),
      ],
      into("0.3.0")
    );
    expect(notes).toBe(
      `## 0.3.0 (2026-09-02)

### Features

- add a rule ([\`5f7c58e\`](${URL}/5f7c58e))

### Bug Fixes

- allow a bare return ([\`9a5f019\`](${URL}/9a5f019))

### Performance

- minify the dist ([\`e5a4c2e\`](${URL}/e5a4c2e))
`
    );
  });

  it("puts breaking changes first, whatever their type", () => {
    const notes = renderNotes([entry({ breaking: true })], into("1.0.0"));
    expect(notes).toContain("### Breaking Changes");
    expect(notes.indexOf("### Breaking Changes")).toBeLessThan(notes.length);
    expect(notes).not.toContain("### Features");
  });

  it("labels a shared commit and leaves the package's own commits bare", () => {
    const notes = renderNotes(
      [entry({ area: "shared", subject: "bump the toolchain" }), entry({ subject: "add a rule" })],
      into("0.3.0")
    );
    expect(notes).toContain("- **shared:** bump the toolchain");
    expect(notes).toContain("- add a rule");
  });

  it("leaves out the other package's commits", () => {
    const notes = renderNotes([entry({ area: "fmt", subject: "widen the print" })], into("0.3.0"));
    expect(notes).not.toContain("widen the print");
    expect(notes).toBe("## 0.3.0 (2026-09-02)\n\n");
  });

  it("falls back to Other Changes so a chore-only release is not blank", () => {
    const notes = renderNotes([entry({ type: "chore", subject: "bump deps" })], into("0.2.1"));
    expect(notes).toContain("### Other Changes");
    expect(notes).toContain("- bump deps");
  });

  it("hides chores when there is anything user-facing to show", () => {
    const notes = renderNotes(
      [entry({ type: "chore", subject: "bump deps" }), entry({ subject: "add a rule" })],
      into("0.3.0")
    );
    expect(notes).not.toContain("bump deps");
    expect(notes).toContain("- add a rule");
  });
});

describe("withNotes", () => {
  it("inserts above the newest entry, keeping the title", () => {
    const existing = "# @ashstack/lint\n\n## 0.2.0\n\n- old\n";
    expect(withNotes(existing, "## 0.3.0 (2026-09-02)\n\n- new\n")).toBe(
      "# @ashstack/lint\n\n## 0.3.0 (2026-09-02)\n\n- new\n\n## 0.2.0\n\n- old\n"
    );
  });

  it("appends when the file has no entries yet", () => {
    expect(withNotes("# @ashstack/fmt\n", "## 0.1.0 (2026-09-02)\n\n- first\n")).toBe(
      "# @ashstack/fmt\n\n## 0.1.0 (2026-09-02)\n\n- first\n"
    );
  });
});

describe("commitUrlOf", () => {
  it("strips the git prefix and the .git suffix", () => {
    expect(commitUrlOf("git+https://github.com/AlshehriAli0/ashStack.git")).toBe(URL);
  });
});
