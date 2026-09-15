# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
ALE FTE Reconciliation for PSD P223 Enrollment.

Processes GVA ALE report data to:
- Assign correct FTE per section based on paired school
- Verify combined ALE + RS FTE <= 1.30
- Extract CTE ALE sections (OCT135, OPE901)
- Generate CTE report for CTE program
- Split by in-district and out-of-district

Usage:
    uv run ale_reconciler.py --ale-data ale_report.csv --school GVA --json
    uv run ale_reconciler.py --help
"""

import argparse
import csv
import json
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

# ALE FTE rates by paired school (updated annually from bell schedules)
ALE_FTE_RATES = {
    # Part-time GVA paired with GHHS or PHS: first section 0.15, additional 0.17
    "GHHS": {"first": 0.15, "additional": 0.17},
    "PHS": {"first": 0.15, "additional": 0.17},
    # Part-time GVA paired with HBHS
    "HBHS": {"flat": 0.21},
    # Part-time GVA paired with middle school
    "GMS": {"flat": 0.16},
    "HRMS": {"flat": 0.16},
    "KPMS": {"flat": 0.16},
    "Kopa": {"flat": 0.16},
    # Part-time GVA paired with elementary
    "ES": {"flat": 0.20},
}

# Known CTE ALE course numbers
CTE_COURSE_NUMBERS = frozenset({"OCT135", "OPE901"})

PSD_DISTRICT_CODE = "2740"


@dataclass
class ALEStudent:
    student_id: str
    name: str
    grade: str
    school: str  # primary school code
    paired_school: str  # brick-and-mortar school
    resident_district: str
    sections: list[dict] = field(default_factory=list)  # [{course, section, fte, is_cte, is_non_fte}]
    headcount: float = 1.0
    total_ale_fte: float = 0.0
    rs_fte: float = 0.0
    combined_fte: float = 0.0
    is_in_district: bool = True
    warnings: list[str] = field(default_factory=list)


@dataclass
class ALEReconciliationReport:
    school: str
    count_date: str
    students: list[ALEStudent] = field(default_factory=list)
    cte_sections: list[dict] = field(default_factory=list)

    # Totals by school
    school_totals: dict = field(default_factory=dict)

    # In/out district
    total_hc_in: int = 0
    total_fte_in: float = 0.0
    total_hc_out: int = 0
    total_fte_out: float = 0.0

    warnings: list[str] = field(default_factory=list)

    def to_markdown(self) -> str:
        lines = [
            f"# ALE FTE Reconciliation Report — {self.school}",
            f"\nCount Date: {self.count_date}",
            f"\n## Summary",
            f"- Total students: {len(self.students)}",
            f"- In-district: HC={self.total_hc_in}, FTE={self.total_fte_in:.2f}",
            f"- Out-of-district: HC={self.total_hc_out}, FTE={self.total_fte_out:.2f}",
        ]

        if self.warnings:
            lines.append(f"\n## Warnings\n")
            for w in self.warnings:
                lines.append(f"- {w}")

        # School totals
        if self.school_totals:
            lines.append(f"\n## By Paired School\n")
            lines.append("| School | HC In | FTE In | HC Out | FTE Out |")
            lines.append("|--------|-------|--------|--------|---------|")
            for sch, totals in sorted(self.school_totals.items()):
                lines.append(
                    f"| {sch} | {totals.get('hc_in', 0)} | {totals.get('fte_in', 0):.2f} | "
                    f"{totals.get('hc_out', 0)} | {totals.get('fte_out', 0):.2f} |"
                )

        # By grade
        grade_totals: dict[str, dict] = {}
        for s in self.students:
            g = s.grade
            if g not in grade_totals:
                grade_totals[g] = {"hc_in": 0, "fte_in": 0.0, "hc_out": 0, "fte_out": 0.0}
            if s.is_in_district:
                grade_totals[g]["hc_in"] += int(s.headcount)
                grade_totals[g]["fte_in"] += s.total_ale_fte
            else:
                grade_totals[g]["hc_out"] += int(s.headcount)
                grade_totals[g]["fte_out"] += s.total_ale_fte

        if grade_totals:
            lines.append(f"\n## By Grade Level\n")
            lines.append("| Grade | HC In | FTE In | HC Out | FTE Out |")
            lines.append("|-------|-------|--------|--------|---------|")
            for g in sorted(grade_totals, key=lambda x: (int(x) if x.lstrip("-").isdigit() else 99)):
                t = grade_totals[g]
                lines.append(
                    f"| {g} | {t['hc_in']} | {t['fte_in']:.2f} | {t['hc_out']} | {t['fte_out']:.2f} |"
                )

        # CTE sections
        if self.cte_sections:
            lines.append(f"\n## CTE ALE Sections\n")
            lines.append("| Student | Grade | Course | Section | CTE FTE | School |")
            lines.append("|---------|-------|--------|---------|---------|--------|")
            for c in self.cte_sections:
                lines.append(
                    f"| {c['student_id']} | {c['grade']} | {c['course']} | "
                    f"{c['section']} | {c['cte_fte']:.2f} | {c['school']} |"
                )

            # CTE totals by school
            cte_by_school: dict[str, float] = {}
            for c in self.cte_sections:
                sch = c["school"]
                cte_by_school[sch] = cte_by_school.get(sch, 0) + c["cte_fte"]
            lines.append(f"\n**CTE FTE Totals by School:**")
            for sch, fte in sorted(cte_by_school.items()):
                lines.append(f"- {sch}: {fte:.2f}")

        # RS over-cap students
        over_cap = [s for s in self.students if s.combined_fte > 1.30]
        if over_cap:
            lines.append(f"\n## Running Start Over-Cap (>1.30)\n")
            lines.append("| Student | Grade | ALE FTE | RS FTE | Combined |")
            lines.append("|---------|-------|---------|--------|----------|")
            for s in over_cap:
                lines.append(
                    f"| {s.student_id} | {s.grade} | {s.total_ale_fte:.2f} | "
                    f"{s.rs_fte:.2f} | {s.combined_fte:.2f} |"
                )

        return "\n".join(lines)


def calculate_ale_fte_for_student(
    sections: list[dict],
    paired_school: str,
    is_full_time_gva: bool = False,
) -> list[dict]:
    """
    Calculate ALE FTE for each section based on paired school rules.

    Returns updated sections with calculated FTE.
    """
    result = []
    rates = ALE_FTE_RATES.get(paired_school, ALE_FTE_RATES.get("ES", {"flat": 0.17}))

    ale_section_count = 0
    for sec in sections:
        is_non_fte = sec.get("is_non_fte", False)
        course = sec.get("course", "")

        if is_non_fte:
            result.append({**sec, "calculated_fte": 0.0})
            continue

        ale_section_count += 1

        if "flat" in rates:
            fte = rates["flat"]
        elif "first" in rates:
            fte = rates["first"] if ale_section_count == 1 else rates["additional"]
        else:
            fte = 0.17

        # Check if CTE
        is_cte = course in CTE_COURSE_NUMBERS

        result.append({
            **sec,
            "calculated_fte": fte,
            "is_cte": is_cte,
        })

    return result


def get_cte_fte(section: dict, paired_school: str) -> float:
    """Get the CTE FTE rate for a section based on the school."""
    if paired_school in ("PHS", "GHHS"):
        return min(0.15, 0.17)  # lesser of 0.15 or 0.17
    elif paired_school == "HBHS":
        return 0.17
    else:
        return 0.17  # GVA default


def reconcile_ale(
    students_data: list[dict],
    school: str = "GVA",
    count_date: str = "",
    student_id_field: str = "Student_Number",
    grade_field: str = "Grade_Level",
    course_field: str = "Course",
    section_field: str = "Section",
    fte_field: str = "FTE",
    school_field: str = "School",
    paired_school_field: str = "PairedSchool",
    resident_district_field: str = "ResidentDistrict",
    rs_fte_field: str = "RS_FTE",
) -> ALEReconciliationReport:
    """Run full ALE reconciliation."""
    report = ALEReconciliationReport(school=school, count_date=count_date)

    # Group data by student
    student_map: dict[str, ALEStudent] = {}
    for row in students_data:
        sid = row.get(student_id_field, "")
        if not sid:
            continue

        if sid not in student_map:
            paired = row.get(paired_school_field, "")
            res_dist = row.get(resident_district_field, PSD_DISTRICT_CODE)
            student_map[sid] = ALEStudent(
                student_id=sid,
                name=row.get("Name", row.get("LastFirst", "")),
                grade=row.get(grade_field, "?"),
                school=row.get(school_field, school),
                paired_school=paired,
                resident_district=res_dist,
                is_in_district=(res_dist == PSD_DISTRICT_CODE),
                rs_fte=float(row.get(rs_fte_field, 0) or 0),
            )

        # Add section
        course = row.get(course_field, "")
        non_fte_courses = {"Early Dismissal", "Late Arrival", "Running Start", "WST", "See Counselor"}
        is_non_fte = course in non_fte_courses

        student_map[sid].sections.append({
            "course": course,
            "section": row.get(section_field, ""),
            "reported_fte": float(row.get(fte_field, 0) or 0),
            "is_non_fte": is_non_fte,
            "is_cte": course in CTE_COURSE_NUMBERS,
        })

    # Process each student
    for sid, student in student_map.items():
        is_full_time = len([s for s in student.sections if not s.get("is_non_fte")]) >= 5

        # Calculate FTE per section
        calculated_sections = calculate_ale_fte_for_student(
            student.sections, student.paired_school, is_full_time
        )
        student.sections = calculated_sections
        student.total_ale_fte = round(sum(s["calculated_fte"] for s in calculated_sections), 2)

        # Cap at 1.0
        if student.total_ale_fte > 1.0 and is_full_time:
            student.warnings.append(f"FTE {student.total_ale_fte} capped to 1.0")
            student.total_ale_fte = 1.0

        # Combined FTE check
        student.combined_fte = round(student.total_ale_fte + student.rs_fte, 2)
        if student.combined_fte > 1.30:
            student.warnings.append(
                f"Combined ALE+RS FTE {student.combined_fte} exceeds 1.30 cap"
            )
            report.warnings.append(
                f"Student {sid}: ALE={student.total_ale_fte} + RS={student.rs_fte} = {student.combined_fte} > 1.30"
            )

        # Extract CTE sections
        for sec in calculated_sections:
            if sec.get("is_cte"):
                cte_fte = get_cte_fte(sec, student.paired_school)
                report.cte_sections.append({
                    "student_id": sid,
                    "name": student.name,
                    "grade": student.grade,
                    "course": sec["course"],
                    "section": sec["section"],
                    "cte_fte": cte_fte,
                    "school": student.paired_school or student.school,
                })

        # Accumulate totals
        paired = student.paired_school or "GVA"
        if paired not in report.school_totals:
            report.school_totals[paired] = {"hc_in": 0, "fte_in": 0.0, "hc_out": 0, "fte_out": 0.0}

        if student.is_in_district:
            report.school_totals[paired]["hc_in"] += int(student.headcount)
            report.school_totals[paired]["fte_in"] += student.total_ale_fte
            report.total_hc_in += int(student.headcount)
            report.total_fte_in += student.total_ale_fte
        else:
            report.school_totals[paired]["hc_out"] += int(student.headcount)
            report.school_totals[paired]["fte_out"] += student.total_ale_fte
            report.total_hc_out += int(student.headcount)
            report.total_fte_out += student.total_ale_fte

        report.students.append(student)

    return report


def load_csv(path: str) -> list[dict]:
    if not Path(path).exists():
        return []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return [{k.strip(): (v.strip() if v else "") for k, v in row.items()} for row in reader]


def main():
    parser = argparse.ArgumentParser(description="PSD ALE FTE Reconciliation")
    parser.add_argument("--ale-data", help="Path to ALE report CSV")
    parser.add_argument("--school", default="GVA", help="School code")
    parser.add_argument("--count-date", default="", help="Count date")
    parser.add_argument("--output", help="Output path for report")
    parser.add_argument("--cte-output", help="Output path for CTE report")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    data = load_csv(args.ale_data) if args.ale_data else []
    report = reconcile_ale(data, school=args.school, count_date=args.count_date)

    if args.json:
        # Serialize — convert ALEStudent objects
        output = {
            "school": report.school,
            "count_date": report.count_date,
            "total_hc_in": report.total_hc_in,
            "total_fte_in": round(report.total_fte_in, 2),
            "total_hc_out": report.total_hc_out,
            "total_fte_out": round(report.total_fte_out, 2),
            "school_totals": report.school_totals,
            "cte_sections": report.cte_sections,
            "warnings": report.warnings,
            "student_count": len(report.students),
        }
        print(json.dumps(output, indent=2))
    else:
        md = report.to_markdown()
        if args.output:
            Path(args.output).write_text(md)
            print(f"Report written to {args.output}")
        else:
            print(md)

    # CTE report
    if args.cte_output and report.cte_sections:
        cte_lines = ["Student,Grade,Course,Section,CTE_FTE,School"]
        for c in report.cte_sections:
            cte_lines.append(
                f"{c['student_id']},{c['grade']},{c['course']},"
                f"{c['section']},{c['cte_fte']:.2f},{c['school']}"
            )
        Path(args.cte_output).write_text("\n".join(cte_lines))
        print(f"CTE report written to {args.cte_output}")


if __name__ == "__main__":
    main()
