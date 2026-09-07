import { describe, expect, it } from "bun:test";

import { requestedDirs } from "../scripts/packages.js";
import { bumped } from "../scripts/release-version.js";

describe("bumped", () => {
  it("raises the patch and leaves the rest alone", () => {
    expect(bumped("0.7.0", "patch")).toBe("0.7.1");
  });

  it("raises the minor and clears the patch", () => {
    expect(bumped("0.7.3", "minor")).toBe("0.8.0");
  });

  it("raises the major and clears both", () => {
    expect(bumped("0.7.3", "major")).toBe("1.0.0");
  });

  it("carries a two-digit component rather than treating it as a string", () => {
    expect(bumped("1.9.9", "minor")).toBe("1.10.0");
  });

  it("refuses a version that is not three parts", () => {
    expect(() => bumped("1.0", "patch")).toThrow("not a major.minor.patch");
  });

  it("refuses a prerelease rather than guessing what comes next", () => {
    expect(() => bumped("1.0.0-rc.1", "patch")).toThrow("not a major.minor.patch");
  });

  it("refuses a part that is not a number", () => {
    expect(() => bumped("1.x.0", "patch")).toThrow("not a major.minor.patch");
  });
});

describe("requestedDirs", () => {
  it("reads both as every package", () => {
    expect(requestedDirs("both")).toEqual(["lint", "fmt"]);
  });

  it("reads one name as that package alone", () => {
    expect(requestedDirs("lint")).toEqual(["lint"]);
  });

  it("reads a comma-separated list", () => {
    expect(requestedDirs("fmt,lint")).toEqual(["lint", "fmt"]);
  });

  it("reads a name it does not know as no packages", () => {
    expect(requestedDirs("docs")).toEqual([]);
  });
});
