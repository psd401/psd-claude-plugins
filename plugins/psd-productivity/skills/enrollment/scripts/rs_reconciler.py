# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Running Start Reconciliation for PSD P223 Enrollment.

Compares TCC Running Start reports against PowerSchool RS data to:
- Verify combined district + RS FTE <= 1.30 per student
- Identify full-time vs part-time RS correctly
- Populate RSCNTRL spreadsheet data
- Flag January semester-change SQEAF requirements
- Cross-check against GVA full-time students

Usage:
    uv run rs_reconciler.py --tcc-report tcc.csv --ps-report ps_rs.csv --json
    uv run rs_reconciler.py --help
"""

import argparse
import csv
import json
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


@dataclass
class RSStudent:
    student_id: str
    name: str
    grade: str
    school: str  # HS school (GHHS, PHS, HBHS)
    district_fte: float  # FTE claimed at the high school
    rs_nonvoc_fte: float  # Non-vocational RS FTE from college
    rs_voc_fte: float  # Vocational RS FTE from college
    rs_total_fte: float  # Total RS FTE
    combined_fte: float  # district + RS
    is_full_time_rs: bool  # No HS sections = full-time RS
    is_part_time_rs: bool
    rs_program: str  # "1" (Concurrent) or "2" (College Only)
    in_tcc: bool = True  # On TCC report
    in_ps: bool = True  # In PowerSchool
    warnings: list[str] = field(default_factory=list)


@dataclass
class RSReconciliationReport:
    count_date: str
    count_month: str
    is_january: bool = False  # January = semester change, SQEAF needed
    students: list[RSStudent] = field(default_factory=list)

    # Per-school totals for RSCNTRL
    school_totals: dict = field(default_factory=dict)

    # Issues
    over_cap: list[RSStudent] = field(default_factory=list)
    tcc_only: list[dict] = field(default_factory=list)  # In TCC but not PS
    ps_only: list[dict] = field(default_factory=list)  # In PS but not TCC
    sqeaf_needed: list[RSStudent] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_markdown(self) -> str:
        lines = [
            f"# Running Start Reconciliation Report",
            f"\nCount Date: {self.count_date}",
            f"Month: {self.count_month}",
        ]

        if self.is_january:
            lines.append("\n**JANUARY — Semester change. SQEAF forms may be required.**")

        # Summary
        ft = [s for s in self.students if s.is_full_time_rs]
        pt = [s for s in self.students if s.is_part_time_rs]
        lines.extend([
            f"\n## Summary",
            f"- Total RS students: {len(self.students)}",
            f"- Full-time RS (backed out of HC): {len(ft)}",
            f"- Part-time RS (some HS FTE): {len(pt)}",
            f"- Over 1.30 combined FTE: {len(self.over_cap)}",
            f"- In TCC but not PS: {len(self.tcc_only)}",
            f"- In PS but not TCC: {len(self.ps_only)}",
        ])

        if self.sqeaf_needed:
            lines.append(f"- SQEAF needed: {len(self.sqeaf_needed)}")

        # School totals (for RSCNTRL)
        if self.school_totals:
            lines.append(f"\n## RSCNTRL Data (by School)\n")
            lines.append("| School | PT HC | FT HC | Non-Voc FTE | Voc FTE | Total RS FTE |")
            lines.append("|--------|-------|-------|-------------|---------|--------------|")
            for sch, t in sorted(self.school_totals.items()):
                lines.append(
                    f"| {sch} | {t['pt_hc']} | {t['ft_hc']} | "
                    f"{t['nonvoc_fte']:.2f} | {t['voc_fte']:.2f} | {t['total_fte']:.2f} |"
                )

        # Grade breakdown per school
        grade_data: dict[str, dict[str, dict]] = {}
        for s in self.students:
            sch = s.school
            if sch not in grade_data:
                grade_data[sch] = {}
            if s.grade not in grade_data[sch]:
                grade_data[sch][s.grade] = {"ft": 0, "pt": 0}
            if s.is_full_time_rs:
                grade_data[sch][s.grade]["ft"] += 1
            else:
                grade_data[sch][s.grade]["pt"] += 1

        if grade_data:
            lines.append(f"\n## By School and Grade\n")
            for sch in sorted(grade_data):
                lines.append(f"### {sch}\n")
                lines.append("| Grade | Full-Time | Part-Time |")
                lines.append("|-------|-----------|-----------|")
                for g in sorted(grade_data[sch], key=lambda x: int(x) if x.isdigit() else 99):
                    d = grade_data[sch][g]
                    lines.append(f"| {g} | {d['ft']} | {d['pt']} |")

        # Over-cap students
        if self.over_cap:
            lines.append(f"\n## Over 1.30 Combined FTE\n")
            lines.append("| Student | Grade | School | District FTE | RS FTE | Combined |")
            lines.append("|---------|-------|--------|-------------|--------|----------|")
            for s in self.over_cap:
                lines.append(
                    f"| {s.student_id} | {s.grade} | {s.school} | "
                    f"{s.district_fte:.2f} | {s.rs_total_fte:.2f} | {s.combined_fte:.2f} |"
                )

        # Mismatches
        if self.tcc_only:
            lines.append(f"\n## In TCC Report But NOT in PowerSchool\n")
            lines.append("Action: Contact high school registrar to reconcile.\n")
            for s in self.tcc_only:
                lines.append(f"- {s.get('student_id', '?')} — {s.get('name', '?')} (Grade {s.get('grade', '?')})")

        if self.ps_only:
            lines.append(f"\n## In PowerSchool But NOT in TCC Report\n")
            lines.append("Action: Verify RS status is still active. May need override removed.\n")
            for s in self.ps_only:
                lines.append(f"- {s.get('student_id', '?')} — {s.get('name', '?')} (Grade {s.get('grade', '?')})")

        # SQEAF
        if self.sqeaf_needed:
            lines.append(f"\n## SQEAF Required (January Semester Change)\n")
            lines.append("These students exceed 1.30 combined FTE during semester change.\n")
            for s in self.sqeaf_needed:
                lines.append(
                    f"- {s.student_id} ({s.school}): "
                    f"District={s.district_fte:.2f} + RS={s.rs_total_fte:.2f} = {s.combined_fte:.2f}"
                )

        return "\n".join(lines)


def reconcile_running_start(
    tcc_data: list[dict],
    ps_data: list[dict],
    count_date: str = "",
    count_month: str = "",
    tcc_id_field: str = "Student_Number",
    ps_id_field: str = "Student_Number",
    cap: float = 1.30,
) -> RSReconciliationReport:
    """Run RS reconciliation between TCC report and PowerSchool data."""
    is_jan = count_month.lower().startswith("jan")
    report = RSReconciliationReport(
        count_date=count_date,
        count_month=count_month,
        is_january=is_jan,
    )

    # Index by student ID
    tcc_map = {}
    for row in tcc_data:
        sid = row.get(tcc_id_field, "").strip()
        if sid:
            tcc_map[sid] = row

    ps_map = {}
    for row in ps_data:
        sid = row.get(ps_id_field, "").strip()
        if sid:
            ps_map[sid] = row

    all_ids = set(tcc_map.keys()) | set(ps_map.keys())

    for sid in sorted(all_ids):
        tcc = tcc_map.get(sid)
        ps = ps_map.get(sid)

        if tcc and not ps:
            report.tcc_only.append({
                "student_id": sid,
                "name": tcc.get("Name", tcc.get("LastFirst", "")),
                "grade": tcc.get("Grade_Level", tcc.get("Grade", "?")),
            })
            report.warnings.append(f"Student {sid} in TCC report but not in PowerSchool")
            continue

        if ps and not tcc:
            report.ps_only.append({
                "student_id": sid,
                "name": ps.get("Name", ps.get("LastFirst", "")),
                "grade": ps.get("Grade_Level", ps.get("Grade", "?")),
            })
            report.warnings.append(f"Student {sid} in PowerSchool RS but not in TCC report")
            # Still process PS-only students
            tcc = {}

        # Merge data
        name = (ps or tcc or {}).get("Name", (ps or tcc or {}).get("LastFirst", ""))
        grade = (ps or {}).get("Grade_Level", (ps or {}).get("Grade", (tcc or {}).get("Grade", "?")))
        school = (ps or {}).get("School", (ps or {}).get("SchoolName", ""))

        district_fte = float((ps or {}).get("District_FTE", (ps or {}).get("BasicFTE", 0)) or 0)
        rs_nonvoc = float((tcc or ps or {}).get("NonVoc_FTE", (tcc or ps or {}).get("RS_NonVoc", 0)) or 0)
        rs_voc = float((tcc or ps or {}).get("Voc_FTE", (tcc or ps or {}).get("RS_Voc", 0)) or 0)
        rs_total = round(rs_nonvoc + rs_voc, 2)
        combined = round(district_fte + rs_total, 2)

        # Full-time RS = backed out full 1.0 (no HS sections)
        is_full_time = district_fte == 0 or district_fte >= 1.0  # backed out = district shows 0 or 1.0 adjustment
        # More accurate: full-time if not scheduled at HS
        if (ps or {}).get("RS_Program", "") == "2" or (ps or {}).get("RS_Program", "") == "College Only":
            is_full_time = True

        rs_program = (ps or {}).get("RS_Program", "")

        student = RSStudent(
            student_id=sid,
            name=name,
            grade=grade,
            school=school,
            district_fte=district_fte,
            rs_nonvoc_fte=rs_nonvoc,
            rs_voc_fte=rs_voc,
            rs_total_fte=rs_total,
            combined_fte=combined,
            is_full_time_rs=is_full_time,
            is_part_time_rs=not is_full_time,
            rs_program=rs_program,
            in_tcc=sid in tcc_map,
            in_ps=sid in ps_map,
        )

        # Check cap
        if combined > cap:
            student.warnings.append(f"Combined FTE {combined} exceeds {cap}")
            report.over_cap.append(student)
            if is_jan:
                report.sqeaf_needed.append(student)

        # Accumulate school totals
        if school not in report.school_totals:
            report.school_totals[school] = {
                "pt_hc": 0, "ft_hc": 0,
                "nonvoc_fte": 0.0, "voc_fte": 0.0, "total_fte": 0.0,
            }
        t = report.school_totals[school]
        if is_full_time:
            t["ft_hc"] += 1
        else:
            t["pt_hc"] += 1
        t["nonvoc_fte"] += rs_nonvoc
        t["voc_fte"] += rs_voc
        t["total_fte"] += rs_total

        report.students.append(student)

    return report


def load_csv(path: str) -> list[dict]:
    if not Path(path).exists():
        return []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return [{k.strip(): (v.strip() if v else "") for k, v in row.items()} for row in reader]


def main():
    parser = argparse.ArgumentParser(description="PSD Running Start Reconciliation")
    parser.add_argument("--tcc-report", help="Path to TCC RS report CSV")
    parser.add_argument("--ps-report", help="Path to PowerSchool RS export CSV")
    parser.add_argument("--count-date", default="", help="Count date")
    parser.add_argument("--count-month", default="", help="Count month name")
    parser.add_argument("--rs-cap", type=float, default=1.30, help="Combined FTE cap")
    parser.add_argument("--output", help="Output path for report")
    parser.add_argument("--rscntrl-output", help="Output RSCNTRL data as JSON")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    tcc_data = load_csv(args.tcc_report) if args.tcc_report else []
    ps_data = load_csv(args.ps_report) if args.ps_report else []

    report = reconcile_running_start(
        tcc_data, ps_data,
        count_date=args.count_date,
        count_month=args.count_month,
        cap=args.rs_cap,
    )

    if args.json:
        output = {
            "count_date": report.count_date,
            "count_month": report.count_month,
            "is_january": report.is_january,
            "total_students": len(report.students),
            "full_time": len([s for s in report.students if s.is_full_time_rs]),
            "part_time": len([s for s in report.students if s.is_part_time_rs]),
            "over_cap": len(report.over_cap),
            "tcc_only": len(report.tcc_only),
            "ps_only": len(report.ps_only),
            "school_totals": report.school_totals,
            "warnings": report.warnings,
        }
        print(json.dumps(output, indent=2))
    else:
        md = report.to_markdown()
        if args.output:
            Path(args.output).write_text(md)
            print(f"Report written to {args.output}")
        else:
            print(md)

    if args.rscntrl_output:
        Path(args.rscntrl_output).write_text(json.dumps(report.school_totals, indent=2))
        print(f"RSCNTRL data written to {args.rscntrl_output}")


if __name__ == "__main__":
    main()
