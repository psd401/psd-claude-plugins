import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { findUnpinnedRefs } from "./check-workflow-pins.js";

const SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const DIGEST = "a".repeat(64);

describe("findUnpinnedRefs", () => {
  test("tag-pinned action fails and names file:line", () => {
    const problems = findUnpinnedRefs("steps:\n  - uses: actions/checkout@v7\n", "ci.yml");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toStartWith("ci.yml:2: actions/checkout@v7");
  });

  test("branch-pinned reusable workflow fails", () => {
    expect(findUnpinnedRefs("    uses: PSD401/.github/.github/workflows/reusable-psd-ci.yml@main\n")).toHaveLength(1);
  });

  test("SHA-pinned action and reusable workflow pass, with or without a comment", () => {
    const text = [
      `  - uses: actions/checkout@${SHA} # v7.0.1`,
      `    uses: PSD401/.github/.github/workflows/reusable-psd-ci.yml@${SHA}`,
      `  - uses: "actions/setup-go@${SHA}"`,
    ].join("\n");
    expect(findUnpinnedRefs(text)).toEqual([]);
  });

  test("short, uppercase, and missing refs fail", () => {
    for (const ref of ["actions/checkout@3d3c42e", `actions/checkout@${SHA.toUpperCase()}`, "actions/checkout"]) {
      expect(findUnpinnedRefs(`  - uses: ${ref}\n`)).toHaveLength(1);
    }
  });

  test("local refs are exempt; docker refs need a digest", () => {
    expect(findUnpinnedRefs("  - uses: ./.github/actions/setup\n")).toEqual([]);
    expect(findUnpinnedRefs(`  - uses: docker://alpine@sha256:${DIGEST}\n`)).toEqual([]);
    expect(findUnpinnedRefs("  - uses: docker://alpine:3.20\n")).toHaveLength(1);
  });

  test("a comment mentioning uses: is ignored", () => {
    expect(findUnpinnedRefs("  # uses: actions/checkout@v7 was here\n")).toEqual([]);
  });

  test("this repo's workflows are all pinned", () => {
    const dir = new URL("../.github/workflows/", import.meta.url);
    const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    const problems = files.flatMap((f) => findUnpinnedRefs(readFileSync(new URL(f, dir), "utf8"), f));
    expect(problems).toEqual([]);
  });
});
