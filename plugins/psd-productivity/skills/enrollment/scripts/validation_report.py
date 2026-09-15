# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Phase 5: Comprehensive Validation Report + EDS Import File Generator.

Aggregates results from all validation scripts into a single report and
generates an EDS-ready import structure.

Usage:
    uv run validation_report.py --school-data schools.json --output report.md --eds-output eds_import.json
    uv run validation_report.py --help
"""

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class SchoolData:
    """Enrollment data for one school."""
    code: str
    name: str
    level: str  # ES, MS, HS, ALT
    headcount_by_grade: dict[str, int] = field(default_factory=dict)
    fte_by_grade: dict[str, float] = field(default_factory=dict)
    adjustments_by_grade: dict[str, float] = field(default_factory=dict)
    ale_hc: int = 0
    ale_fte: float = 0.0
    rs_hc_total: int = 0
    rs_hc_fulltime: int = 0
    rs_nonvoc_fte: float = 0.0
    rs_voc_fte: float = 0.0
    tbip_k5: int = 0
    tbip_7_12: int = 0
    tbip_exited: int = 0
    cte_fte: float = 0.0
    cte_ale_fte: float = 0.0
    open_doors_hc: int = 0
    open_doors_nonvoc_fte: float = 0.0
    open_doors_voc_fte: float = 0.0
    tk_hc: int = 0
    tk_fte: float = 0.0
    tbip_tk: int = 0
    cte_fte_7_8: float = 0.0
    cte_fte_9_12: float = 0.0
    validation_results: list[dict] = field(default_factory=list)


@dataclass
class DistrictTotals:
    """District-level totals for EDS submission."""
    total_hc: int = 0
    total_fte: float = 0.0
    total_ale_hc: int = 0
    total_ale_fte: float = 0.0
    total_rs_hc: int = 0
    total_rs_ft_hc: int = 0
    total_rs_nonvoc: float = 0.0
    total_rs_voc: float = 0.0
    total_tbip_k5: int = 0
    total_tbip_7_12: int = 0
    total_tbip_exited: int = 0
    total_cte_fte: float = 0.0
    total_cte_ale_fte: float = 0.0
    total_open_doors_hc: int = 0
    total_open_doors_nonvoc: float = 0.0
    total_open_doors_voc: float = 0.0
    total_tk_hc: int = 0
    total_tk_fte: float = 0.0
    total_tbip_tk: int = 0
    total_cte_fte_7_8: float = 0.0
    total_cte_fte_9_12: float = 0.0


def generate_validation_report(
    schools: list[SchoolData],
    count_date: str,
    count_month: str,
) -> str:
    """Generate comprehensive markdown validation report."""
    district = DistrictTotals()

    # Accumulate district totals
    for s in schools:
        school_hc = sum(s.headcount_by_grade.values())
        school_fte = sum(s.fte_by_grade.values())
        district.total_hc += school_hc
        district.total_fte += school_fte
        district.total_ale_hc += s.ale_hc
        district.total_ale_fte += s.ale_fte
        district.total_rs_hc += s.rs_hc_total
        district.total_rs_ft_hc += s.rs_hc_fulltime
        district.total_rs_nonvoc += s.rs_nonvoc_fte
        district.total_rs_voc += s.rs_voc_fte
        district.total_tbip_k5 += s.tbip_k5
        district.total_tbip_7_12 += s.tbip_7_12
        district.total_tbip_exited += s.tbip_exited
        district.total_cte_fte += s.cte_fte
        district.total_cte_ale_fte += s.cte_ale_fte
        district.total_open_doors_hc += s.open_doors_hc
        district.total_open_doors_nonvoc += s.open_doors_nonvoc_fte
        district.total_open_doors_voc += s.open_doors_voc_fte
        district.total_tk_hc += s.tk_hc
        district.total_tk_fte += s.tk_fte
        district.total_tbip_tk += s.tbip_tk
        district.total_cte_fte_7_8 += s.cte_fte_7_8
        district.total_cte_fte_9_12 += s.cte_fte_9_12

    # Count validation issues
    all_checks = []
    for s in schools:
        all_checks.extend(s.validation_results)
    fails = [c for c in all_checks if c.get("status") == "FAIL"]
    warns = [c for c in all_checks if c.get("status") == "WARN"]
    passes = [c for c in all_checks if c.get("status") == "PASS"]

    lines = [
        f"# P223 Comprehensive Validation Report",
        f"\n**District**: Peninsula School District (2740)",
        f"**Count Date**: {count_date}",
        f"**Month**: {count_month}",
        f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"**Schools Processed**: {len(schools)}",

        f"\n---\n",

        f"## District Totals\n",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total Headcount | {district.total_hc} |",
        f"| Total FTE | {district.total_fte:.2f} |",
        f"| ALE HC / FTE | {district.total_ale_hc} / {district.total_ale_fte:.2f} |",
        f"| RS Total HC | {district.total_rs_hc} |",
        f"| RS Full-Time HC (backed out) | {district.total_rs_ft_hc} |",
        f"| RS Non-Voc FTE | {district.total_rs_nonvoc:.2f} |",
        f"| RS Voc FTE | {district.total_rs_voc:.2f} |",
        f"| TBIP K-5 | {district.total_tbip_k5} |",
        f"| TBIP 7-12 | {district.total_tbip_7_12} |",
        f"| TBIP Exited | {district.total_tbip_exited} |",
        f"| CTE FTE | {district.total_cte_fte:.2f} (7-8: {district.total_cte_fte_7_8:.2f} / 9-12: {district.total_cte_fte_9_12:.2f}) |",
        f"| TK HC / FTE | {district.total_tk_hc} / {district.total_tk_fte:.2f} |",
        f"| TBIP TK | {district.total_tbip_tk} |",
        f"| CTE ALE FTE | {district.total_cte_ale_fte:.2f} |",
        f"| Open Doors HC | {district.total_open_doors_hc} |",

        f"\n---\n",

        f"## Validation Summary\n",
        f"- Total checks run: {len(all_checks)}",
        f"- **Passed: {len(passes)}**",
        f"- **Failed: {len(fails)}**",
        f"- **Warnings: {len(warns)}**",
    ]

    # Critical issues
    if fails:
        lines.append(f"\n## Critical Issues ({len(fails)})\n")
        for c in fails:
            lines.append(f"### {c.get('school', '?')} — {c.get('name', '?')}")
            lines.append(f"{c.get('message', '')}\n")
            for d in c.get("details", []):
                lines.append(f"- {d}")
            lines.append("")

    # Warnings
    if warns:
        lines.append(f"\n## Warnings ({len(warns)})\n")
        for c in warns:
            lines.append(f"### {c.get('school', '?')} — {c.get('name', '?')}")
            lines.append(f"{c.get('message', '')}\n")
            for d in c.get("details", []):
                lines.append(f"- {d}")
            lines.append("")

    # Per-school detail
    lines.append(f"\n---\n")
    lines.append(f"## School Detail\n")

    for s in schools:
        school_hc = sum(s.headcount_by_grade.values())
        school_fte = sum(s.fte_by_grade.values())
        school_adj = sum(s.adjustments_by_grade.values())

        lines.append(f"### {s.name} ({s.code}) — {s.level}\n")
        lines.append(f"| Grade | HC | FTE | Adjustment |")
        lines.append(f"|-------|----|-----|------------|")

        for grade in sorted(s.headcount_by_grade.keys(),
                           key=lambda g: (int(g) if g.lstrip("-").isdigit() else 99, g)):
            hc = s.headcount_by_grade.get(grade, 0)
            fte = s.fte_by_grade.get(grade, 0)
            adj = s.adjustments_by_grade.get(grade, 0)
            lines.append(f"| {grade} | {hc} | {fte:.2f} | {adj:.2f} |")

        lines.append(f"| **Total** | **{school_hc}** | **{school_fte:.2f}** | **{school_adj:.2f}** |")

        if s.ale_hc > 0:
            lines.append(f"\nALE: HC={s.ale_hc}, FTE={s.ale_fte:.2f}")
        if s.rs_hc_total > 0:
            lines.append(
                f"Running Start: Total HC={s.rs_hc_total}, Full-time={s.rs_hc_fulltime}, "
                f"Non-Voc={s.rs_nonvoc_fte:.2f}, Voc={s.rs_voc_fte:.2f}"
            )
        if s.tbip_k5 + s.tbip_7_12 + s.tbip_exited > 0:
            lines.append(f"TBIP: K-5={s.tbip_k5}, 7-12={s.tbip_7_12}, Exited={s.tbip_exited}")
        if s.cte_fte > 0:
            lines.append(f"CTE: FTE={s.cte_fte:.2f} (7-8: {s.cte_fte_7_8:.2f} / 9-12: {s.cte_fte_9_12:.2f}), ALE FTE={s.cte_ale_fte:.2f}")
        if s.tk_hc > 0:
            lines.append(f"TK: HC={s.tk_hc}, FTE={s.tk_fte:.2f}, TBIP TK={s.tbip_tk}")

        # School-level validation
        school_checks = [c for c in all_checks if c.get("school") == s.code]
        if school_checks:
            school_fails = [c for c in school_checks if c.get("status") == "FAIL"]
            school_warns = [c for c in school_checks if c.get("status") == "WARN"]
            school_pass = [c for c in school_checks if c.get("status") == "PASS"]
            lines.append(
                f"\nValidation: {len(school_pass)} passed, "
                f"{len(school_fails)} failed, {len(school_warns)} warnings"
            )

        lines.append("")

    # Human review section
    lines.append(f"\n---\n")
    lines.append(f"## Human Review Required\n")
    lines.append("Before uploading to EDS, verify:\n")
    lines.append("- [ ] All critical issues above are resolved")
    lines.append("- [ ] School totals on internal P223 match this report")
    lines.append("- [ ] District totals match sum of school tabs")
    lines.append("- [ ] K-3 class size data entered separately in EDS")
    lines.append("- [ ] Any revisions to previous months processed")
    lines.append("- [ ] Principal signatures obtained on enrollment reports")

    return "\n".join(lines)


def generate_eds_import(
    schools: list[SchoolData],
    count_date: str,
    count_month: str,
) -> dict:
    """
    Generate EDS-ready import data structure.

    This produces the data needed for EDS entry. The actual EDS import format
    may require specific field mappings — this provides the structured data
    for a human to enter or for future EDS API integration.
    """
    district_code = "2740"
    district_name = "Peninsula School District"

    eds_data = {
        "district_code": district_code,
        "district_name": district_name,
        "count_date": count_date,
        "count_month": count_month,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "schools": [],
    }

    for s in schools:
        school_entry = {
            "school_code": s.code,
            "school_name": s.name,
            "level": s.level,
            "grades": {},
            "totals": {
                "headcount": sum(s.headcount_by_grade.values()),
                "fte": round(sum(s.fte_by_grade.values()), 2),
                "adjustments": round(sum(s.adjustments_by_grade.values()), 2),
            },
            "ale": {"hc": s.ale_hc, "fte": round(s.ale_fte, 2)},
            "running_start": {
                "total_hc": s.rs_hc_total,
                "fulltime_hc": s.rs_hc_fulltime,
                "nonvoc_fte": round(s.rs_nonvoc_fte, 2),
                "voc_fte": round(s.rs_voc_fte, 2),
            },
            "tbip": {
                "k5": s.tbip_k5,
                "7_12": s.tbip_7_12,
                "exited": s.tbip_exited,
            },
            "cte": {
                "fte": round(s.cte_fte, 2),
                "ale_fte": round(s.cte_ale_fte, 2),
            },
            "open_doors": {
                "hc": s.open_doors_hc,
                "nonvoc_fte": round(s.open_doors_nonvoc_fte, 2),
                "voc_fte": round(s.open_doors_voc_fte, 2),
            },
            "tk": {"hc": s.tk_hc, "fte": round(s.tk_fte, 2), "tbip_tk": s.tbip_tk},
            "cte_split": {"fte_7_8": round(s.cte_fte_7_8, 2), "fte_9_12": round(s.cte_fte_9_12, 2)},
        }

        for grade in sorted(s.headcount_by_grade.keys(),
                           key=lambda g: (int(g) if g.lstrip("-").isdigit() else 99, g)):
            school_entry["grades"][grade] = {
                "headcount": s.headcount_by_grade.get(grade, 0),
                "fte": round(s.fte_by_grade.get(grade, 0), 2),
                "adjustment": round(s.adjustments_by_grade.get(grade, 0), 2),
            }

        eds_data["schools"].append(school_entry)

    # District totals
    eds_data["district_totals"] = {
        "headcount": sum(sum(s.headcount_by_grade.values()) for s in schools),
        "fte": round(sum(sum(s.fte_by_grade.values()) for s in schools), 2),
        "ale_hc": sum(s.ale_hc for s in schools),
        "ale_fte": round(sum(s.ale_fte for s in schools), 2),
        "rs_total_hc": sum(s.rs_hc_total for s in schools),
        "rs_fulltime_hc": sum(s.rs_hc_fulltime for s in schools),
        "rs_nonvoc_fte": round(sum(s.rs_nonvoc_fte for s in schools), 2),
        "rs_voc_fte": round(sum(s.rs_voc_fte for s in schools), 2),
        "tbip_k5": sum(s.tbip_k5 for s in schools),
        "tbip_7_12": sum(s.tbip_7_12 for s in schools),
        "tbip_exited": sum(s.tbip_exited for s in schools),
        "cte_fte": round(sum(s.cte_fte for s in schools), 2),
        "open_doors_hc": sum(s.open_doors_hc for s in schools),
    }

    return eds_data


def main():
    parser = argparse.ArgumentParser(description="P223 Validation Report & EDS Import Generator")
    parser.add_argument("--school-data", help="Path to JSON file with school enrollment data")
    parser.add_argument("--count-date", required=True, help="Count date")
    parser.add_argument("--count-month", required=True, help="Count month name")
    parser.add_argument("--output", help="Output path for validation report (markdown)")
    parser.add_argument("--eds-output", help="Output path for EDS import data (JSON)")

    args = parser.parse_args()

    # Load school data
    schools = []
    if args.school_data and Path(args.school_data).exists():
        raw = json.loads(Path(args.school_data).read_text())
        for s in raw.get("schools", []):
            sd = SchoolData(
                code=s.get("code", ""),
                name=s.get("name", ""),
                level=s.get("level", ""),
                headcount_by_grade=s.get("headcount_by_grade", {}),
                fte_by_grade={k: float(v) for k, v in s.get("fte_by_grade", {}).items()},
                adjustments_by_grade={k: float(v) for k, v in s.get("adjustments_by_grade", {}).items()},
                ale_hc=s.get("ale_hc", 0),
                ale_fte=float(s.get("ale_fte", 0)),
                rs_hc_total=s.get("rs_hc_total", 0),
                rs_hc_fulltime=s.get("rs_hc_fulltime", 0),
                rs_nonvoc_fte=float(s.get("rs_nonvoc_fte", 0)),
                rs_voc_fte=float(s.get("rs_voc_fte", 0)),
                tbip_k5=s.get("tbip_k5", 0),
                tbip_7_12=s.get("tbip_7_12", 0),
                tbip_exited=s.get("tbip_exited", 0),
                cte_fte=float(s.get("cte_fte", 0)),
                cte_ale_fte=float(s.get("cte_ale_fte", 0)),
                open_doors_hc=s.get("open_doors_hc", 0),
                open_doors_nonvoc_fte=float(s.get("open_doors_nonvoc_fte", 0)),
                open_doors_voc_fte=float(s.get("open_doors_voc_fte", 0)),
                tk_hc=s.get("tk_hc", 0), tk_fte=s.get("tk_fte", 0.0), tbip_tk=s.get("tbip_tk", 0),
                cte_fte_7_8=s.get("cte_fte_7_8", 0.0), cte_fte_9_12=s.get("cte_fte_9_12", 0.0),
                validation_results=s.get("validation_results", []),
            )
            schools.append(sd)
    else:
        print("No school data provided. Generating empty report template.", file=sys.stderr)

    # Generate validation report
    report_md = generate_validation_report(schools, args.count_date, args.count_month)

    if args.output:
        Path(args.output).write_text(report_md)
        print(f"Validation report written to {args.output}")
    else:
        print(report_md)

    # Generate EDS import
    if args.eds_output:
        eds_data = generate_eds_import(schools, args.count_date, args.count_month)
        Path(args.eds_output).write_text(json.dumps(eds_data, indent=2))
        print(f"EDS import data written to {args.eds_output}")


if __name__ == "__main__":
    main()
