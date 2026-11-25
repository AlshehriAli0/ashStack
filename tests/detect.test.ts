import { describe, expect, it } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { detect } from "../packages/lint/dist/lib/detect.js";
import { inDir, install, workspace } from "./workspace.js";

const RNGH = "react-native-gesture-handler";

describe("detect", () => {
  it("is on when the package is a dependency of the current directory", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("is off when no listed package is a dependency", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["react-native-unistyles"]))).toBe(false);
  });

  it("is on when any one of several packages matches", () => {
    const paths = workspace({ repo: { dependencies: { "use-intl": "^3.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["i18next", "use-intl", "lingui"]))).toBe(true);
  });

  it("is on when packages is absent", () => {
    const paths = workspace({ repo: {} });
    expect(inDir(paths.repo!, () => detect(undefined, undefined))).toBe(true);
  });

  it("is off for an empty package list", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, []))).toBe(false);
  });

  it("reads devDependencies", () => {
    const paths = workspace({ repo: { devDependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("reads peerDependencies", () => {
    const paths = workspace({ repo: { peerDependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("finds a dependency declared at the workspace root from a nested package", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } }, "repo/apps/mobile": {} });
    expect(inDir(paths["repo/apps/mobile"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("finds a dependency declared in the nested package itself", () => {
    const paths = workspace({ repo: {}, "repo/apps/mobile": { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths["repo/apps/mobile"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("stops at the repo boundary and ignores a package.json above it", () => {
    const paths = workspace({ "": { dependencies: { zod: "^4.0.0" } }, repo: {} });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(false);
  });

  it("includes the boundary directory's own package.json", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } }, "repo/apps": {} });
    expect(inDir(paths["repo/apps"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("survives a directory with no package.json on the way up", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } }, "repo/a/b/c": {} });
    expect(inDir(paths["repo/a/b/c"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("survives an unparseable package.json", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } }, "repo/broken": {} });
    writeFileSync(join(paths["repo/broken"]!, "package.json"), "{ not json");
    expect(inDir(paths["repo/broken"]!, () => detect(undefined, ["zod"]))).toBe(true);
  });

  it("lets an explicit true win over a missing dependency", () => {
    const paths = workspace({ repo: {} });
    expect(inDir(paths.repo!, () => detect(true, ["zod"]))).toBe(true);
  });

  it("lets an explicit false win over a present dependency", () => {
    const paths = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    expect(inDir(paths.repo!, () => detect(false, ["zod"]))).toBe(false);
  });

  it("lets an explicit false win even when packages is absent", () => {
    const paths = workspace({ repo: {} });
    expect(inDir(paths.repo!, () => detect(false, undefined))).toBe(false);
  });

  it("gives different answers in different directories of the same run", () => {
    const withZod = workspace({ repo: { dependencies: { zod: "^4.0.0" } } });
    const without = workspace({ repo: {} });
    expect(inDir(withZod.repo!, () => detect(undefined, ["zod"]))).toBe(true);
    expect(inDir(without.repo!, () => detect(undefined, ["zod"]))).toBe(false);
  });

  it("caches per directory, so a package.json written after the first read is not seen", () => {
    const paths = workspace({ repo: {} });
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(false);
    writeFileSync(join(paths.repo!, "package.json"), JSON.stringify({ dependencies: { zod: "^4.0.0" } }));
    expect(inDir(paths.repo!, () => detect(undefined, ["zod"]))).toBe(false);
  });
});

describe("detect with a minimum major", () => {
  it("is on when the installed version is at that major", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "^3.0.0" } } });
    install(paths.repo!, RNGH, "3.5.0");
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(true);
  });

  it("is on when the installed version is past that major", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "^4.0.0" } } });
    install(paths.repo!, RNGH, "4.0.1");
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(true);
  });

  it("is off when the installed version is an earlier major", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "~2.28.0" } } });
    install(paths.repo!, RNGH, "2.28.0");
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(false);
  });

  it("trusts the installed version over a declared range that says otherwise", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "^3.0.0" } } });
    install(paths.repo!, RNGH, "2.28.0");
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(false);
  });

  it("finds a version hoisted to the workspace root from a nested package", () => {
    const paths = workspace({ repo: {}, "repo/apps/mobile": { dependencies: { [RNGH]: "^3.0.0" } } });
    install(paths.repo!, RNGH, "3.5.0");
    expect(inDir(paths["repo/apps/mobile"]!, () => detect(undefined, [RNGH], 3))).toBe(true);
  });

  it("reads the nearest install first, so a nested copy shadows the hoisted one", () => {
    const paths = workspace({ repo: {}, "repo/apps/mobile": { dependencies: { [RNGH]: "*" } } });
    install(paths.repo!, RNGH, "3.5.0");
    install(paths["repo/apps/mobile"]!, RNGH, "2.28.0");
    expect(inDir(paths["repo/apps/mobile"]!, () => detect(undefined, [RNGH], 3))).toBe(false);
  });

  it("falls back to the declared range's minimum when nothing is installed", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "^3.0.0-beta.2" } } });
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(true);
  });

  it("is off when the declared range starts below that major", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: ">=2.20.0 <4" } } });
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(false);
  });

  it("reads an npm alias range by the version after the last @", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "npm:@fork/gesture-handler@^3.1.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(true);
  });

  it("reads a workspace protocol range by the version after the protocol", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "workspace:^3.0.0" } } });
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(true);
  });

  it("is off when neither the install nor the range names a version", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "latest" } } });
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(false);
  });

  it("ignores an installed copy of a package no package.json declares", () => {
    const paths = workspace({ repo: {} });
    install(paths.repo!, RNGH, "3.5.0");
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH], 3))).toBe(false);
  });

  it("lets an explicit true win over an earlier major", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "^2.28.0" } } });
    expect(inDir(paths.repo!, () => detect(true, [RNGH], 3))).toBe(true);
  });

  it("asks nothing of the version when no major is given", () => {
    const paths = workspace({ repo: { dependencies: { [RNGH]: "latest" } } });
    expect(inDir(paths.repo!, () => detect(undefined, [RNGH]))).toBe(true);
  });
});
