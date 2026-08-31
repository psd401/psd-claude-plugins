# FTE Calculation Rules

> Sources: P223 Compliance Form and Audit, PSD Comprehensive Enrollment Reporting Manual,
> Appendix: Student FTE Calculation by School by Period

## Core Principle

- Full-time student = 1.0 FTE = at least **1,665 instructional minutes per week**
- FTE = weekly instructional minutes ÷ 1,665
- Passing time IS included; lunch IS NOT included
- Bell schedules must NEVER be changed during count window
- Bell schedules are pulled live from PowerSchool each year (not hardcoded)

## Elementary Schools

**Calculation**: Weekly instructional/service minutes (excluding lunch) ÷ 1,665 = FTE

- Example: 4 days × 360 min + 1 day × 300 min = 1,740 min → 1,740 / 1,665 = 1.04 FTE (capped at 1.0)
- Students attending less than full day get FTE override
- FTE Override path: PowerSchool > Compliance > FTE Equivalency Overrides > Basic FTE Override

**Who needs an override**:
- Ancillary students (IEP services only — OT, PT, etc.) — Student Services calculates FTE
- Part-time students attending less than a full day

## Middle Schools

**Calculation**: FTE per period based on bell schedule minutes, includes flex/passing time

### FTE Per Period (2022-23 — recalculated annually from bell schedules)

| School | Flex Time | Period 1-6 |
|--------|-----------|------------|
| GMS (Goodman) | 0.09 | 0.16 each |
| HRMS (Harbor Ridge) | 0.07 | 0.16 each |
| KPMS (Key Peninsula) | 0.06 | 0.16 each |
| Kopachuck | 0.07 | 0.16 (Period 5: 0.06) |

**Full schedule**: Flex + 6 periods = ~1.0 FTE (e.g., 0.09 + 6×0.16 = 1.05 at GMS)

**Who needs an FTE override at MS**:
- Students without a full schedule who attend all assigned classes do NOT need an override — their schedule determines FTE
- Ancillary students (enrolled in Ancillary Section) — Student Services calculates FTE
- AES students with emergency removal on modified attendance — FTE based on time attending/tutoring

### Example Bell Schedule Calculation (from P223 doc)

MTTHF: PT 34 min × 4 = 136, Periods 1-6 at 54 min × 4 = 216 each
Wednesday: Periods 1-6 at 48-52 min each
Total: Passing=136, P1=268, P2-6=264 each = **1,724 min** (exceeds 1,665)

## High Schools (GHHS / PHS)

### FTE Per Period

| Component | FTE |
|-----------|-----|
| Zero Hour (6:15-7:25) | 0.17 |
| Period 1-6 | 0.17 each |
| Homeroom | 0.02 |
| WST adjustment | 0.45 |

**Full-time student**: 6 classes + homeroom (with or without Zero Hour) = 1.0 FTE
- Full-time students receive adjustment of -0.02 (total FTE slightly over 1.0)

**Partial schedule examples**:
- 5 classes + homeroom + early dismissal/late arrival ≈ 0.87–0.88 FTE
- Zero Hour can be included in FTE if student has less than full schedule (but cannot claim passing minutes between Zero Hour and Period 1)

### Example Bell Schedule Calculation (from P223 doc)

MTTF: 60 min × 6 periods × 4 days = 1,440 min
Wednesday: 45 min × 6 periods + 35 min HR = 305 min
Total: 1,440 + 305 = **1,745 min** → 1,745 / 1,665 = 1.04 FTE

## Henderson Bay High School (HBHS)

| Component | FTE |
|-----------|-----|
| Advisory | 0.14 |
| Period 1-4 | 0.21 each |
| WST adjustment | 0.44 |

4 periods + advisory structure (different from GHHS/PHS 6-period day)

## Global Virtual Academy (GVA / ALE)

### Elementary (Full/Part Time GVA)
- 5 sections, **0.20 per section** when part-time GVA

### Middle School (Full/Part Time GVA)
- 5 sections + Advisory = full time
- **0.16 per section** when part-time GVA

### High School Full Time (PAP, Track C)
- 6 sections, 5+ sections = full time
- Advisory (weekly 15-30 min check-in) NOT counted
- **0.17 per section** when less than full schedule

### High School Part Time (under GHHS or PHS)
- 6 sections total, 5 HS + 1 GVA: GVA section = **0.15**
- 6 sections total, >1 GVA: first GVA = **0.15**, rest = **0.17**
- <6 sections (RS, ED/LA, HomeSchool): GVA sections = **0.17**
- GVA sections scheduled for 7th period NOT counted toward ALE

### High School Part Time (under HBHS)
- **0.21 per section** (CTE ALE FTE = 0.17)

### Split School Rules
- GVA + Elementary: ALE section = **0.20**
- GVA + Middle School: ALE section = **0.16**
- GVA + GHHS/PHS: first ALE section = **0.15**, additional = **0.17**
- GVA + HBHS: ALE sections = **0.21**

## Running Start FTE Rules

- Combined district FTE + RS FTE must be ≤ **1.20** in PowerSchool
- **2026-27: validate against 1.20** (confirmed by Hagel, 2026-08-31). Historical note: state allowed 1.40 for 25-26, but PS capped at 1.20 (reported to PowerSchool as a bug)
- January exception: semester change may cause temporary over-1.20; requires SQEAF form to verify annual average stays ≤ 1.20
- Full-time RS: student backed out full 1.0 from headcount (no HS sections)
- Part-time RS: some FTE claimed at HS, some at RS
- RS students categorized as Program 1 (Concurrently Enrolled) or Program 2 (College Only)

## Non-FTE Courses (Placeholder Courses)

These do NOT contribute to FTE and should be marked as Non-FTE Course:
- HomeSchool
- PrivateSchool
- Late Arrival
- Early Dismissal
- See Counselor
- WST (Work Study/Transition)
- Running Start
- Fresh Start

**Audit courses** should NOT be excluded from FTE.
**Courses with Content Area Code ZZZ** (non-instructional) are NOT included in FTE calculation.

## FTE Adjustment Calculation

The "adjustment" is what gets subtracted from headcount:
1. Calculate student's actual FTE from their schedule + bell schedule
2. Adjustment = 1.0 - calculated FTE
3. Reported FTE = Headcount - Adjustment

Example: Student has 4 of 6 periods at HS (0.17 × 4 = 0.68) + homeroom (0.02) = 0.70 FTE
Adjustment = 1.0 - 0.70 = **0.30**

## Special Cases

### Interdistrict Agreement (IA)
- Student splitting FTE between PSD and another district
- Combined FTE must be ≤ 1.0
- FTE per Choice Transfer agreement

### 20 Consecutive Absences
- Student backed out full 1.0 FTE from current month
- Exception: signed Planned Absence Request allows claiming for 2 monthly count dates if student returns by EOY

### Preschool
- NOT reported by buildings
- PK students on IEP ARE reported by Student Services
- If withdrawing PK student with date prior to count date, contact Special Ed Data Compliance
