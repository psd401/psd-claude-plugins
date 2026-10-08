# P223 Process — Step-by-Step Procedure

> Extracted from "PowerSchool P223 Report and Audit" (PSD internal document)
> and "PSD Comprehensive Enrollment Reporting Manual"

## Overview

Public schools are funded based on student enrollment. Each student has a headcount (HC) of 1.0 and generates a Full Time Equivalent (FTE). Schools report TK–12 headcount and FTE by grade level monthly, noting students reported at less than 1.0 FTE.

**Count Day**: 1st school day of each month (Oct–Jun). September uses the 4th school day.

## Pre-Count Data Cleanup (All Schools)

1. Ensure all attending students are enrolled in PowerSchool and assigned to classes
2. Ensure all withdrawn students are exited in PowerSchool
3. Run **Section Enrollment Audit** to find unassigned students
   - Path: System Reports > Membership and Enrollment > Section Enrollment Audit
4. Follow up on previous month's part-time students for FTE changes
5. Check for backdated exits requiring prior month revision:
   - Re-run previous month's Enrollment Summary; if numbers differ, a revision is needed

## Running the P223 Report

### Path
Data and Reporting > Reports > Compliance > P223 Form and Audit

> **This is the primary monthly deliverable.** Run this first (after FTE overrides are confirmed). The backup reports (Enrollment Summary, Student List, etc.) are supporting documentation.

### Parameters by School Level

| Parameter | Elementary | Middle School | High School |
|-----------|-----------|---------------|-------------|
| Select Schools | Current School Only | Current School Only | Current School Only |
| Students to Include | All Students | All Students | All Students |
| Report Date | **Count Date** | **Count Date** | **Count Date** |
| Resident District | All Students | All Students | All Students |
| Separate form per school | Checked | Checked | Checked |
| Audit type | Long Headers | Long Headers | Long Headers |
| Calculate Elementary FTE | **Calculate** | **Calculate** (for 6th graders) | **Calculate** (for 6th graders) |
| FTE Calculation Window | **1 Day** | **5 Day** | **5 Day** |
| Window Counting Method | Forward | Forward | Forward |
| FTE Calculation Date | **Count Date** | **Leave blank** | **Leave blank** |

### Key Differences
- **Elementary**: 1-Day window, FTE Calc Date = count date
- **Middle/High**: 5-Day window (accounts for late-start Wednesday), FTE Calc Date left blank
- Calculate Elementary FTE must be checked at all levels or 6th graders with partial schedules get incorrectly counted as 1.00

## Students to Exclude (20+ Consecutive Absences)

1. Mark exclusion: PowerSchool > Compliance > Student Settings
2. Check "Exclude from P223" (do NOT check "Exclude from other state reporting")
3. Select appropriate reason, click Submit
4. Monthly review: Level Data > Data Validations > Reports/Lists tab > "List students excluded from State Reporting"

## Running the Report When Not on Count Day

If running the P223 after the count date:
1. Navigate to School Enrollment > Enrollment Summary > Continue > All Active Enrollments
2. Set Date = Count Day
3. Click on number next to total > Make Students Current Selection
   - OR search: `*as_of=MM/DD/YYYY`
4. When running P223, select "The Selected Students Only"
5. Set Report Date to count date and subsequent five days

**CRITICAL**: The P223 is a static field and does NOT hold historical data by month. When running for a previous month, backup data is needed to adjust FTE Overrides first.

## Backup Reports Required (All Schools)

**Always use the correct count date when running reports!**

### Elementary Schools (5 reports)

| # | Report | Path | Parameters |
|---|--------|------|------------|
| 1 | Enrollment Summary | Left Menu > Enrollment Summary | Date = Count Date |
| 2 | Student List Export | Click All Students > Group Function: Export Using Template > (Dist) Enrollment - Monthly Backup Student List | Submit > Save |
| 3 | Attendance Audit | Data and Reporting > Reports > System Reports > Class Attendance Audit | Count Date for Begin/End, All Teachers, Period 1, Header Month Date = Count Date |
| 4 | Entry/Exit Report | `/admin/reports/CRB/enrollment/EntryExitReport.html` (interactive, auto-refreshes on month change — no submit button) | Previous Month — verify prev HC + entries - exits = current HC |
| 5 | Consecutive Absence | Attendance > Consecutive Absence Report | All absence codes except the partial-day codes TDY, TDX, LU, LVE, LBR, OTH and the present code P (2026-10-08), Begin Date = first day of school, End = Count Date, 20 consecutive days |

### Middle & High Schools (6 reports — adds Student Schedule)

All 5 elementary reports PLUS:

| # | Report | Path | Parameters |
|---|--------|------|------------|
| 6 | Student Schedule Report | Select "All" or "Gr" > Group Functions: Student Schedule Report | Title + Count Date, 3 students per pg, count day as date. Save as PDF |

**Note**: Consecutive Absence Report at secondary needs to be run in two parts at term break because it is by class.

## FTE Reporting Exclusions (High School Pre-Check)

Before running P223:
- Any student excluded from headcount must be marked "Exclude from P223 Reports" or "Exclude from All State Reports" (Compliance Student page)
- Use Data Validations > Reports/Lists > Students excluded from State Reporting
- Click "Students with FTE Override" on start page to verify only needed overrides exist
- Running Start students must be categorized as (1) Concurrently Enrolled or (2) College Only

## Running Start FTE Overrides

1. Check `S_WA_STU_X.RunningStart#` and run Export Template "(Dist) Running Start Overrides"
2. Sort by grade level then last name, compare to college documentation
3. Verify full-time RS: click "Running Start College Only Student" on PS start page
4. Verify part-time RS: click "Running Start Concurrent Student" on PS start page
5. Enrollment Officer enters Non-Vocational and Vocational RS FTE Override from college reports
6. Manually delete overrides for students no longer in RS

## Fresh Start (Open Doors) FTE Overrides

1. Search Student > Compliance > Programs > Open Doors Enrollment
2. Click on start date, enter non-vocational and vocational FTE from monthly report
3. Fresh Start students must be Track=C
4. All Fresh Start students need Program 40 (1418 Reengagement, Qualification Code 436 Peninsula SD / Tacoma CC)

## ALE Reporting

- Sections must be marked ALE
- All ALE students must have an ALE Override
- PS fields: `[S_WA_STU_FTE_X]ALE_BasicFTE`, `ALE_Voc_FTE`, `ALESkills_FTE`, `ALESkillsBasic_FTE`

## TBIP (Transitional Bilingual Instructional Program)

- Check P223 Audit Form columns P through T
- Enrolled: Student marked Yes for STBP, OR ELL Exit Date blank/after report start AND ELL Enroll Date before report start
- Exited: ELL exit date before report date + "Exited TBIP" checked + "Include as exited TBIP on P223 for Year" includes report year
- Contact: Jayme Croff or her team

## CTE (Vocational Enhanced Enrollment)

- Courses must be set up as Vocational
- Grades 7 and up
- Can verify via: Data and Reporting > Reports > System Reports > Class Attendance Audit (CTE classes only)

## Transitional Kindergarten

- Students at grade_level -3 report in Transitional Kindergarten
- TK students enrolled as Kindergarten in PS, reported within K numbers
- Identified by: Program 67-Transitional Kindergarten, Track C, TK teacher assignment

## District Office Monthly Process

See `report-checklist.md` for the complete district-level checklist including:
- Part Time spreadsheet reconciliation
- ALE FTE reconciliation
- Running Start cross-check
- CTE ALE FTE extraction
- Internal P223 population
- EDS submission
- Notification and filing
