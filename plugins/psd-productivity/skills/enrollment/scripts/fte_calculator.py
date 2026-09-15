# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
FTE Calculator for Peninsula School District P223 Enrollment Reporting.

Calculates Full-Time Equivalent (FTE) based on student schedule and school bell schedule.
Core rule: 1,665 instructional minutes per week = 1.0 FTE.

Usage:
    uv run fte_calculator.py --school GHHS --periods 1,2,3,4,5,6 --homeroom --json
    uv run fte_calculator.py --school GMS --periods 1,2,3,4,5,6 --flex --json
    uv run fte_calculator.py --school EES --minutes 1200 --json
    uv run fte_calculator.py --school GVA --gva-type full-time-hs --periods 1,2,3,4,5 --json
"""

import argparse
import json
import sys
from dataclasses import dataclass, field, asdict
from typing import Optional

FULL_TIME_MINUTES = 1665

# Non-FTE placeholder courses — never count toward FTE
NON_FTE_COURSES = frozenset({
    "HomeSchool", "PrivateSchool", "Late Arrival", "Early Dismissal",
    "See Counselor", "WST", "Running Start", "Fresh Start",
})

# ── School FTE tables (2022-23 baseline — update annually from bell schedules) ──

@dataclass
class SchoolFTE:
    """FTE per period for a school. Updated annually from bell schedules."""
    school: str
    level: str  # ES, MS, HS, ALT
    flex: float = 0.0
    periods: dict[str, float] = field(default_factory=dict)
    homeroom: float = 0.0
    zero_hour: float = 0.0
    advisory: float = 0.0
    wst_adjustment: float = 0.0
    full_time_adjustment: float = 0.0  # e.g., -0.02 for HS full-time students

# Middle Schools
SCHOOL_FTE = {
    "GMS": SchoolFTE("GMS", "MS", flex=0.09,
                     periods={str(i): 0.16 for i in range(1, 7)}),
    "HRMS": SchoolFTE("HRMS", "MS", flex=0.07,
                      periods={str(i): 0.16 for i in range(1, 7)}),
    "KPMS": SchoolFTE("KPMS", "MS", flex=0.06,
                      periods={str(i): 0.16 for i in range(1, 7)}),
    "Kopa": SchoolFTE("Kopa", "MS", flex=0.07,
                      periods={"1": 0.16, "2": 0.16, "3": 0.16, "4": 0.16, "5": 0.06, "6": 0.16}),

    # High Schools
    "GHHS": SchoolFTE("GHHS", "HS",
                      periods={str(i): 0.17 for i in range(1, 7)},
                      homeroom=0.02, zero_hour=0.17, wst_adjustment=0.45,
                      full_time_adjustment=-0.02),
    "PHS": SchoolFTE("PHS", "HS",
                     periods={str(i): 0.17 for i in range(1, 7)},
                     homeroom=0.02, zero_hour=0.17, wst_adjustment=0.45,
                     full_time_adjustment=-0.02),
    "HBHS": SchoolFTE("HBHS", "HS",
                      periods={str(i): 0.21 for i in range(1, 5)},
                      advisory=0.14, wst_adjustment=0.44),
}

# Elementary schools all use minutes-based calculation
ELEMENTARY_SCHOOLS = frozenset({
    "AES", "DES", "EES", "HHES", "MCES", "PIE", "PES", "SWES", "VES", "VOY",
})


@dataclass
class FTEResult:
    school: str
    level: str
    calculated_fte: float
    capped_fte: float  # capped at 1.0 for regular, 1.30 for RS
    adjustment: float  # 1.0 - capped_fte
    breakdown: dict
    warnings: list[str]
    is_full_time: bool


def calculate_elementary_fte(weekly_minutes: float) -> FTEResult:
    """Elementary FTE = weekly instructional minutes (excl lunch) / 1665."""
    raw_fte = round(weekly_minutes / FULL_TIME_MINUTES, 4)
    capped = min(raw_fte, 1.0)
    warnings = []
    if weekly_minutes < FULL_TIME_MINUTES:
        warnings.append(f"Below full-time threshold: {weekly_minutes} < {FULL_TIME_MINUTES} min/week")

    return FTEResult(
        school="ES",
        level="ES",
        calculated_fte=raw_fte,
        capped_fte=round(capped, 2),
        adjustment=round(1.0 - capped, 2),
        breakdown={"weekly_minutes": weekly_minutes, "divisor": FULL_TIME_MINUTES, "raw_fte": raw_fte},
        warnings=warnings,
        is_full_time=capped >= 1.0,
    )


def calculate_secondary_fte(
    school_code: str,
    enrolled_periods: list[str],
    has_homeroom: bool = False,
    has_zero_hour: bool = False,
    has_flex: bool = False,
    has_advisory: bool = False,
    non_fte_periods: Optional[list[str]] = None,
) -> FTEResult:
    """Calculate FTE for middle or high school student based on enrolled periods."""
    non_fte_periods = non_fte_periods or []
    school = SCHOOL_FTE.get(school_code)
    if not school:
        return FTEResult(
            school=school_code, level="UNKNOWN", calculated_fte=0, capped_fte=0,
            adjustment=1.0, breakdown={}, warnings=[f"Unknown school code: {school_code}"],
            is_full_time=False,
        )

    breakdown = {}
    total = 0.0
    warnings = []

    # Flex/passing time (MS)
    if has_flex and school.flex > 0:
        total += school.flex
        breakdown["flex"] = school.flex

    # Advisory (HBHS)
    if has_advisory and school.advisory > 0:
        total += school.advisory
        breakdown["advisory"] = school.advisory

    # Zero hour (HS)
    if has_zero_hour and school.zero_hour > 0:
        total += school.zero_hour
        breakdown["zero_hour"] = school.zero_hour

    # Homeroom (HS)
    if has_homeroom and school.homeroom > 0:
        total += school.homeroom
        breakdown["homeroom"] = school.homeroom

    # Periods
    period_detail = {}
    for p in enrolled_periods:
        if p in non_fte_periods:
            period_detail[p] = {"fte": 0.0, "non_fte": True}
            warnings.append(f"Period {p} marked as non-FTE (placeholder course)")
            continue
        fte_val = school.periods.get(p, 0.0)
        if fte_val == 0.0:
            warnings.append(f"Period {p} not found in {school_code} bell schedule")
        total += fte_val
        period_detail[p] = {"fte": fte_val, "non_fte": False}

    breakdown["periods"] = period_detail

    # Check if full-time (all periods filled)
    countable_periods = [p for p in enrolled_periods if p not in non_fte_periods]
    max_periods = len(school.periods)
    is_full_time = len(countable_periods) >= max_periods

    # Full-time adjustment (HS — total slightly over 1.0, adjust to 1.0)
    if is_full_time and has_homeroom and school.full_time_adjustment != 0:
        breakdown["full_time_adjustment"] = school.full_time_adjustment
        # Full-time students are reported as 1.0 FTE regardless of slight overage

    raw_fte = round(total, 4)
    capped = min(raw_fte, 1.0)

    return FTEResult(
        school=school_code,
        level=school.level,
        calculated_fte=raw_fte,
        capped_fte=round(capped, 2),
        adjustment=round(1.0 - capped, 2),
        breakdown=breakdown,
        warnings=warnings,
        is_full_time=is_full_time,
    )


def calculate_gva_fte(
    gva_type: str,
    paired_school: Optional[str] = None,
    num_gva_sections: int = 0,
    num_brick_mortar_sections: int = 0,
    total_sections: int = 0,
) -> FTEResult:
    """
    Calculate GVA (ALE) FTE.

    gva_type: "full-time-es", "full-time-ms", "full-time-hs",
              "part-time-es", "part-time-ms", "part-time-hs"
    paired_school: school code for brick-and-mortar school (e.g., "GHHS", "HBHS")
    """
    breakdown = {}
    warnings = []
    fte = 0.0

    if gva_type == "full-time-es":
        # 5 sections, 0.20 each
        fte = min(num_gva_sections, 5) * 0.20
        breakdown["sections"] = num_gva_sections
        breakdown["fte_per_section"] = 0.20

    elif gva_type == "full-time-ms":
        # 5 sections + advisory = full time, 0.16 each
        fte = min(num_gva_sections, 5) * 0.16
        breakdown["sections"] = num_gva_sections
        breakdown["fte_per_section"] = 0.16

    elif gva_type == "full-time-hs":
        # 5+ sections = full time, 0.17 each, advisory not counted
        fte = min(num_gva_sections, 6) * 0.17
        breakdown["sections"] = num_gva_sections
        breakdown["fte_per_section"] = 0.17
        if num_gva_sections >= 5:
            breakdown["status"] = "full-time"

    elif gva_type.startswith("part-time"):
        if paired_school == "HBHS":
            fte = num_gva_sections * 0.21
            breakdown["fte_per_section"] = 0.21
        elif paired_school in ("GHHS", "PHS"):
            if total_sections >= 6 and num_gva_sections == 1:
                fte = 0.15
                breakdown["rule"] = "6 sections, 1 GVA = 0.15"
            elif total_sections >= 6 and num_gva_sections > 1:
                fte = 0.15 + (num_gva_sections - 1) * 0.17
                breakdown["rule"] = "6 sections, first GVA=0.15, rest=0.17"
            else:
                fte = num_gva_sections * 0.17
                breakdown["rule"] = "<6 sections, GVA sections=0.17"
        elif paired_school in ("GMS", "HRMS", "KPMS", "Kopa"):
            fte = num_gva_sections * 0.16
            breakdown["fte_per_section"] = 0.16
        elif paired_school in ELEMENTARY_SCHOOLS:
            fte = num_gva_sections * 0.20
            breakdown["fte_per_section"] = 0.20
        else:
            fte = num_gva_sections * 0.17
            warnings.append(f"Unknown paired school {paired_school}, defaulting to 0.17/section")

        breakdown["gva_sections"] = num_gva_sections
        breakdown["paired_school"] = paired_school

    raw_fte = round(fte, 4)
    capped = min(raw_fte, 1.0)

    return FTEResult(
        school="GVA",
        level="ALT",
        calculated_fte=raw_fte,
        capped_fte=round(capped, 2),
        adjustment=round(1.0 - capped, 2),
        breakdown=breakdown,
        warnings=warnings,
        is_full_time=raw_fte >= 1.0,
    )


def check_running_start_cap(district_fte: float, rs_fte: float, cap: float = 1.30) -> dict:
    """Check if combined district + Running Start FTE exceeds cap."""
    combined = round(district_fte + rs_fte, 2)
    over = combined > cap
    return {
        "district_fte": district_fte,
        "rs_fte": rs_fte,
        "combined_fte": combined,
        "cap": cap,
        "over_cap": over,
        "excess": round(combined - cap, 2) if over else 0.0,
    }


def main():
    parser = argparse.ArgumentParser(description="PSD P223 FTE Calculator")
    parser.add_argument("--school", required=True, help="School code (e.g., GHHS, GMS, EES, GVA)")
    parser.add_argument("--periods", help="Comma-separated period numbers (e.g., 1,2,3,4,5,6)")
    parser.add_argument("--homeroom", action="store_true", help="Student has homeroom (HS)")
    parser.add_argument("--zero-hour", action="store_true", help="Student has zero hour (HS)")
    parser.add_argument("--flex", action="store_true", help="Include flex/passing time (MS)")
    parser.add_argument("--advisory", action="store_true", help="Student has advisory (HBHS)")
    parser.add_argument("--minutes", type=float, help="Weekly instructional minutes (ES)")
    parser.add_argument("--non-fte-periods", help="Comma-separated non-FTE period numbers")
    parser.add_argument("--gva-type", help="GVA type: full-time-es/ms/hs, part-time-es/ms/hs")
    parser.add_argument("--paired-school", help="Paired brick-and-mortar school for GVA")
    parser.add_argument("--gva-sections", type=int, default=0, help="Number of GVA sections")
    parser.add_argument("--brick-sections", type=int, default=0, help="Number of brick-and-mortar sections")
    parser.add_argument("--rs-fte", type=float, help="Running Start FTE to check combined cap")
    parser.add_argument("--rs-cap", type=float, default=1.30, help="RS combined FTE cap (default 1.30)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()
    school = args.school.upper() if args.school != "Kopa" else "Kopa"

    # Elementary — minutes-based
    if school in ELEMENTARY_SCHOOLS or args.minutes:
        if not args.minutes:
            print("Error: Elementary schools require --minutes", file=sys.stderr)
            sys.exit(1)
        result = calculate_elementary_fte(args.minutes)
        result.school = school

    # GVA
    elif school == "GVA" or args.gva_type:
        total = args.gva_sections + args.brick_sections
        result = calculate_gva_fte(
            gva_type=args.gva_type or "full-time-hs",
            paired_school=args.paired_school,
            num_gva_sections=args.gva_sections,
            num_brick_mortar_sections=args.brick_sections,
            total_sections=total,
        )

    # Secondary — period-based
    else:
        periods = args.periods.split(",") if args.periods else []
        non_fte = args.non_fte_periods.split(",") if args.non_fte_periods else []
        result = calculate_secondary_fte(
            school_code=school,
            enrolled_periods=periods,
            has_homeroom=args.homeroom,
            has_zero_hour=args.zero_hour,
            has_flex=args.flex,
            has_advisory=args.advisory,
            non_fte_periods=non_fte,
        )

    # Optional RS cap check
    rs_check = None
    if args.rs_fte is not None:
        rs_check = check_running_start_cap(result.capped_fte, args.rs_fte, args.rs_cap)

    if args.json:
        output = asdict(result)
        if rs_check:
            output["running_start_check"] = rs_check
        print(json.dumps(output, indent=2))
    else:
        print(f"School: {result.school} ({result.level})")
        print(f"Calculated FTE: {result.calculated_fte}")
        print(f"Reported FTE: {result.capped_fte}")
        print(f"Adjustment: {result.adjustment}")
        print(f"Full-time: {result.is_full_time}")
        if result.warnings:
            print(f"Warnings: {'; '.join(result.warnings)}")
        if rs_check:
            print(f"\nRunning Start Check:")
            print(f"  District FTE: {rs_check['district_fte']}")
            print(f"  RS FTE: {rs_check['rs_fte']}")
            print(f"  Combined: {rs_check['combined_fte']} (cap: {rs_check['cap']})")
            if rs_check["over_cap"]:
                print(f"  *** OVER CAP by {rs_check['excess']} ***")


if __name__ == "__main__":
    main()
