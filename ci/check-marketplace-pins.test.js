import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { findUnpinned } from "./check-marketplace-pins.js";

const SHA = "fc27add0123456789abcdef0123456789abcdef0";
const market = (...plugins) => ({ plugins });

describe("findUnpinned", () => {
  test("unpinned github entry fails and is named", () => {
    const problems = findUnpinned(
      market({ name: "vendor-tool", source: { source: "github", repo: "acme/tool" } }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("vendor-tool");
  });

  test("pinned github entry passes", () => {
    expect(
      findUnpinned(market({ name: "vendor-tool", source: { source: "github", repo: "acme/tool", sha: SHA } })),
    ).toEqual([]);
  });

  test("relative-path entry passes", () => {
    expect(findUnpinned(market({ name: "psd-productivity", source: "./plugins/psd-productivity" }))).toEqual([]);
  });

  test("url and git-subdir sources are checked too", () => {
    const problems = findUnpinned(
      market(
        { name: "by-url", source: { source: "url", url: "https://example.com/tool.git" } },
        { name: "by-subdir", source: { source: "git-subdir", url: "https://example.com/mono.git", path: "x", sha: SHA } },
      ),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("by-url");
  });

  test("short, uppercase, or ref-like sha values fail", () => {
    for (const sha of ["fc27add", SHA.toUpperCase(), "main", `${SHA}0`]) {
      expect(findUnpinned(market({ name: "x", source: { source: "github", repo: "a/b", sha } }))).toHaveLength(1);
    }
  });

  test("every offending entry is reported", () => {
    const problems = findUnpinned(
      market(
        { name: "a", source: { source: "github", repo: "a/a" } },
        { name: "b", source: { source: "github", repo: "b/b" } },
        { name: "ok", source: "./plugins/ok" },
      ),
    );
    expect(problems.map((p) => p.split(":")[0])).toEqual(["a", "b"]);
  });

  test("this repo's marketplace.json passes", () => {
    const repo = JSON.parse(readFileSync(new URL("../.claude-plugin/marketplace.json", import.meta.url), "utf8"));
    expect(findUnpinned(repo)).toEqual([]);
  });
});
