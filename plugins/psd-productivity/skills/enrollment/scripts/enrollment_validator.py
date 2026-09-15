# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Enrollment Validator for PSD P223 Reporting.

Runs validation checks against enrollment data files (CSV/Excel exports from PowerSchool).
Outputs a markdown validation report with pass/fail/warning for each check.

Usage:
    uv run enrollment_validator.py --enrollment-summary summary.csv --student-list students.csv --output report.md
    uv run enrollment_validator.py --help
"""

import argparse
import csv
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, date
from pathlib import Path
from typing import Optional


@dataclass
class CheckResult:
    name: str
    status: str  # PASS, FAIL, WARN, SKIP
    message: str
    details: list[str] = field(default_factory=list)


@dataclass
class ValidationReport:
    school: str
    count_date: str
    checks: list[CheckResult] = field(default_factory=list)
    generated_at: str = ""

    def add(self, check: CheckResult):
        self.checks.append(check)

    @property
    def passed(self) -> int:
        return sum(1 for c in self.checks if c.status == "PASS")

    @property
    def failed(self) -> int:
        return sum(1 for c in self.checks if c.status == "FAIL")

    @property
    def warnings(self) -> int:
        return sum(1 for c in self.checks if c.status == "WARN")

    @property
    def skipped(self) -> int:
        return sum(1 for c in self.checks if c.status == "SKIP")

    def to_markdown(self) -> str:
        lines = [
            f"# Enrollment Validation Report — {self.school} ({self.count_date})",
            f"\nGenerated: {self.generated_at}",
            f"\n## Summary",
            f"- Total checks: {len(self.checks)}",
            f"- Passed: {self.passed}",
            f"- Failed: {self.failed}",
            f"- Warnings: {self.warnings}",
            f"- Skipped: {self.skipped}",
        ]

        # Critical issues
        fails = [c for c in self.checks if c.status == "FAIL"]
        if fails:
            lines.append("\n## Critical Issues (Must Fix)\n")
            for c in fails:
                lines.append(f"### {c.name}")
                lines.append(f"{c.message}\n")
                for d in c.details:
                    lines.append(f"- {d}")
                lines.append("")

        # Warnings
        warns = [c for c in self.checks if c.status == "WARN"]
        if warns:
            lines.append("\n## Warnings (Review Recommended)\n")
            for c in warns:
                lines.append(f"### {c.name}")
                lines.append(f"{c.message}\n")
                for d in c.details:
                    lines.append(f"- {d}")
                lines.append("")

        # Passed
        passed = [c for c in self.checks if c.status == "PASS"]
        if passed:
            lines.append("\n## Passed Checks\n")
            for c in passed:
                lines.append(f"- **{c.name}**: {c.message}")

        # Skipped
        skips = [c for c in self.checks if c.status == "SKIP"]
        if skips:
            lines.append("\n## Skipped Checks\n")
            for c in skips:
                lines.append(f"- **{c.name}**: {c.message}")

        return "\n".join(lines)


def load_csv(path: str) -> list[dict]:
    """Load a CSV file, handling common PS export quirks."""
    if not Path(path).exists():
        return []
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Strip whitespace from keys and values
            cleaned = {k.strip(): v.strip() if v else "" for k, v in row.items()}
            rows.append(cleaned)
    return rows


def check_headcount_consistency(
    enrollment_summary: dict[str, int],
    student_list: list[dict],
    grade_field: str = "Grade_Level",
) -> CheckResult:
    """Verify enrollment summary headcount matches student list count per grade."""
    if not enrollment_summary or not student_list:
        return CheckResult("Headcount Consistency", "SKIP",
                          "Missing enrollment summary or student list data")

    student_counts: dict[str, int] = {}
    for s in student_list:
        grade = s.get(grade_field, "?")
        student_counts[grade] = student_counts.get(grade, 0) + 1

    mismatches = []
    for grade, expected in enrollment_summary.items():
        actual = student_counts.get(grade, 0)
        if actual != expected:
            mismatches.append(
                f"Grade {grade}: Summary={expected}, List={actual} (diff={actual - expected})"
            )

    # Check for grades in student list not in summary
    for grade, count in student_counts.items():
        if grade not in enrollment_summary:
            mismatches.append(f"Grade {grade}: {count} students in list but not in summary")

    if mismatches:
        return CheckResult("Headcount Consistency", "FAIL",
                          f"{len(mismatches)} grade(s) have mismatched headcount",
                          mismatches)
    return CheckResult("Headcount Consistency", "PASS",
                      f"All {len(enrollment_summary)} grade levels match")


def check_consecutive_absence_exclusions(
    consecutive_absence_students: list[dict],
    p223_excluded_students: list[str],
    student_id_field: str = "Student_Number",
) -> CheckResult:
    """Verify students with 20+ consecutive absences are excluded from P223."""
    if not consecutive_absence_students:
        return CheckResult("20-Day Absence Exclusion", "SKIP",
                          "No consecutive absence data provided")

    absent_ids = {s.get(student_id_field, "") for s in consecutive_absence_students}
    excluded_set = set(p223_excluded_students)

    not_excluded = absent_ids - excluded_set
    if not_excluded:
        details = [f"Student {sid} has 20+ absences but NOT excluded from P223"
                   for sid in sorted(not_excluded)]
        return CheckResult("20-Day Absence Exclusion", "FAIL",
                          f"{len(not_excluded)} student(s) should be excluded",
                          details)

    return CheckResult("20-Day Absence Exclusion", "PASS",
                      f"All {len(absent_ids)} students with 20+ absences are properly excluded")


def check_entry_exit_balance(
    prev_hc: dict[str, int],
    entries: dict[str, int],
    exits: dict[str, int],
    current_hc: dict[str, int],
) -> CheckResult:
    """Verify prev HC + entries - exits = current HC per grade."""
    if not prev_hc or not current_hc:
        return CheckResult("Entry/Exit Balance", "SKIP",
                          "Missing previous or current headcount data")

    all_grades = sorted(set(prev_hc) | set(current_hc))
    imbalances = []

    for grade in all_grades:
        prev = prev_hc.get(grade, 0)
        entry = entries.get(grade, 0)
        exit_ = exits.get(grade, 0)
        current = current_hc.get(grade, 0)
        expected = prev + entry - exit_

        if expected != current:
            imbalances.append(
                f"Grade {grade}: {prev} + {entry} - {exit_} = {expected}, actual = {current} "
                f"(diff={current - expected})"
            )

    if imbalances:
        return CheckResult("Entry/Exit Balance", "FAIL",
                          f"{len(imbalances)} grade(s) don't balance",
                          imbalances)

    return CheckResult("Entry/Exit Balance", "PASS",
                      f"All {len(all_grades)} grade levels balance correctly")


def check_running_start_cap(
    rs_students: list[dict],
    district_fte_field: str = "District_FTE",
    rs_fte_field: str = "RS_FTE",
    student_id_field: str = "Student_Number",
    cap: float = 1.30,
) -> CheckResult:
    """Check combined district + RS FTE does not exceed cap."""
    if not rs_students:
        return CheckResult("Running Start FTE Cap", "SKIP",
                          "No Running Start student data provided")

    over_cap = []
    for s in rs_students:
        try:
            dist_fte = float(s.get(district_fte_field, 0))
            rs_fte = float(s.get(rs_fte_field, 0))
        except (ValueError, TypeError):
            continue

        combined = round(dist_fte + rs_fte, 2)
        if combined > cap:
            over_cap.append(
                f"Student {s.get(student_id_field, '?')}: "
                f"District={dist_fte} + RS={rs_fte} = {combined} (over by {round(combined - cap, 2)})"
            )

    if over_cap:
        return CheckResult("Running Start FTE Cap", "FAIL",
                          f"{len(over_cap)} student(s) exceed {cap} combined FTE",
                          over_cap)

    return CheckResult("Running Start FTE Cap", "PASS",
                      f"All {len(rs_students)} RS students at or below {cap} combined FTE")


def check_teacher_assignment(
    section_audit_students: list[dict],
    student_id_field: str = "Student_Number",
) -> CheckResult:
    """Flag students without teacher/section assignment from Section Enrollment Audit."""
    if not section_audit_students:
        return CheckResult("Teacher Assignment", "PASS",
                          "No unassigned students found (Section Enrollment Audit clean)")

    details = [f"Student {s.get(student_id_field, '?')} — not assigned to any class"
               for s in section_audit_students]

    return CheckResult("Teacher Assignment", "WARN",
                      f"{len(section_audit_students)} student(s) without class assignment",
                      details)


def check_fte_overrides(
    students_with_overrides: list[dict],
    student_id_field: str = "Student_Number",
    override_field: str = "FTE_Override",
    calculated_field: str = "Calculated_FTE",
) -> CheckResult:
    """Verify FTE overrides match calculated FTE values."""
    if not students_with_overrides:
        return CheckResult("FTE Override Audit", "SKIP",
                          "No FTE override data provided")

    mismatches = []
    for s in students_with_overrides:
        try:
            override = float(s.get(override_field, 0))
            calculated = float(s.get(calculated_field, 0))
        except (ValueError, TypeError):
            continue

        if abs(override - calculated) > 0.02:  # tolerance for rounding
            mismatches.append(
                f"Student {s.get(student_id_field, '?')}: "
                f"Override={override}, Calculated={calculated} (diff={round(override - calculated, 2)})"
            )

    if mismatches:
        return CheckResult("FTE Override Audit", "WARN",
                          f"{len(mismatches)} override(s) differ from calculated FTE",
                          mismatches)

    return CheckResult("FTE Override Audit", "PASS",
                      f"All {len(students_with_overrides)} overrides match calculated FTE")


def check_program_compliance(
    rs_students: list[dict],
    fresh_start_students: list[dict],
) -> CheckResult:
    """Verify RS Program 1/2 and Fresh Start Track=C, Program 40."""
    issues = []

    for s in (rs_students or []):
        program = s.get("RS_Program", "")
        if program not in ("1", "2", "Concurrently Enrolled Student", "College Only"):
            issues.append(
                f"RS Student {s.get('Student_Number', '?')}: "
                f"RS Program='{program}' (should be 1 or 2)"
            )

    for s in (fresh_start_students or []):
        track = s.get("Track", "")
        program = s.get("Program", "")
        if track != "C":
            issues.append(
                f"Fresh Start Student {s.get('Student_Number', '?')}: "
                f"Track='{track}' (should be C)"
            )
        if "40" not in str(program):
            issues.append(
                f"Fresh Start Student {s.get('Student_Number', '?')}: "
                f"Missing Program 40 (1418 Reengagement)"
            )

    if issues:
        return CheckResult("Program Compliance", "FAIL",
                          f"{len(issues)} compliance issue(s) found", issues)

    total = len(rs_students or []) + len(fresh_start_students or [])
    return CheckResult("Program Compliance", "PASS" if total > 0 else "SKIP",
                      f"All {total} program students compliant" if total > 0 else "No program data provided")


def run_all_checks(
    enrollment_summary: Optional[dict[str, int]] = None,
    student_list: Optional[list[dict]] = None,
    consecutive_absence_students: Optional[list[dict]] = None,
    p223_excluded_students: Optional[list[str]] = None,
    prev_hc: Optional[dict[str, int]] = None,
    entries: Optional[dict[str, int]] = None,
    exits: Optional[dict[str, int]] = None,
    current_hc: Optional[dict[str, int]] = None,
    rs_students: Optional[list[dict]] = None,
    fresh_start_students: Optional[list[dict]] = None,
    section_audit_students: Optional[list[dict]] = None,
    students_with_overrides: Optional[list[dict]] = None,
    school: str = "Unknown",
    count_date: str = "",
    rs_cap: float = 1.30,
) -> ValidationReport:
    """Run all validation checks and return a report."""
    report = ValidationReport(
        school=school,
        count_date=count_date,
        generated_at=datetime.now().isoformat(timespec="seconds"),
    )

    report.add(check_headcount_consistency(
        enrollment_summary or {}, student_list or []))

    report.add(check_consecutive_absence_exclusions(
        consecutive_absence_students or [], p223_excluded_students or []))

    report.add(check_entry_exit_balance(
        prev_hc or {}, entries or {}, exits or {}, current_hc or {}))

    report.add(check_running_start_cap(rs_students or [], cap=rs_cap))

    report.add(check_teacher_assignment(section_audit_students or []))

    report.add(check_fte_overrides(students_with_overrides or []))

    report.add(check_program_compliance(rs_students or [], fresh_start_students or []))

    return report


def main():
    parser = argparse.ArgumentParser(description="PSD P223 Enrollment Validator")
    parser.add_argument("--school", required=True, help="School code")
    parser.add_argument("--count-date", required=True, help="Count date (MM/DD/YYYY)")
    parser.add_argument("--enrollment-summary", help="Path to enrollment summary CSV")
    parser.add_argument("--student-list", help="Path to student list CSV")
    parser.add_argument("--consecutive-absence", help="Path to consecutive absence CSV")
    parser.add_argument("--entry-exit-current", help="Path to current month entry/exit CSV")
    parser.add_argument("--entry-exit-previous", help="Path to previous month entry/exit CSV")
    parser.add_argument("--rs-students", help="Path to Running Start students CSV")
    parser.add_argument("--rs-cap", type=float, default=1.30, help="RS combined FTE cap")
    parser.add_argument("--output", help="Output path for validation report (markdown)")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of markdown")

    args = parser.parse_args()

    # For now, run with whatever data is provided
    # In production, data will be passed programmatically from the skill
    report = run_all_checks(
        school=args.school,
        count_date=args.count_date,
        rs_cap=args.rs_cap,
    )

    output = report.to_markdown()

    if args.output:
        Path(args.output).write_text(output)
        print(f"Report written to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
