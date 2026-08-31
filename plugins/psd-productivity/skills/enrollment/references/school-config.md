# School Configuration — Peninsula School District

> Static data that changes infrequently (yearly at most).
> Bell schedules and FTE-per-period values are pulled live from PowerSchool each fall.

## District Info

- **District Code**: 2740
- **SIS**: PowerSchool
- **State Reporting**: EDS (Education Data System)
- **Enrollment Officer**: Michael George

## Schools

### Elementary Schools (ES) — Grades TK/K–5

| School | Abbreviation | Code | Special Programs | TK Site |
|--------|-------------|------|------------------|---------|
| Artondale ES | AES | — | ECEAP, Dev PK | No |
| Discovery ES | DES | — | TK, PACE | Yes |
| Evergreen ES | EES | — | ECEAP, TK | Yes |
| Harbor Heights ES | HHES | — | TK, Options | Yes |
| Minter Creek ES | MCES | — | TK | Yes |
| Pioneer ES | PIE | — | TRAC, STEAM | No |
| Purdy ES | PES | — | Dev PK, PACE | No |
| Swift Water ES | SWES | — | Options, TRAC | No |
| Vaughn ES | VES | — | ECEAP, Dev PK | No |
| Voyager ES | VOY | — | TK, PACE | Yes |

### Middle Schools (MS) — Grades 6–8

| School | Abbreviation | Code | Special Programs |
|--------|-------------|------|------------------|
| Goodman MS | GMS | — | Options, PACE |
| Harbor Ridge MS | HRMS | — | TRAC |
| Key Peninsula MS | KPMS | — | Options, PACE |
| Kopachuck MS | Kopa | — | PACE |

### High Schools (HS) — Grades 9–12

| School | Abbreviation | Code | Special Programs | Structure |
|--------|-------------|------|------------------|-----------|
| Gig Harbor HS | GHHS | 4081 | Options, ETT, CTE | 6-period + HR + Zero Hour |
| Peninsula HS | PHS | 2681 | Options, TRAC, ETT, CTE | 6-period + HR + Zero Hour |
| Henderson Bay HS | HBHS | — | CTP, PACE, RS | 4-period + Advisory |

### Alternative Programs (under PAP code 5707)

| Program | Track | School Code | Description |
|---------|-------|-------------|-------------|
| Global Virtual Academy (GVA) | C | 5707 (PAP) | K-12 ALE program |
| Fresh Start (Open Doors) | A (C for enrollment) | 5707 (PAP) | Reengagement ages 16-21, via TCC |
| Community Transition Program (CTP) | B | PAP | Ages 18-21, post-secondary transition |

## Feeder Pattern (ES → MS → HS)

| Elementary | Middle School | High School |
|-----------|---------------|-------------|
| Discovery, Harbor Heights | Goodman MS | Gig Harbor HS |
| Purdy, Swift Water | Harbor Ridge MS | Peninsula HS |
| Evergreen, Minter Creek, Vaughn | Key Peninsula MS | Peninsula HS |
| Artondale, Voyager | Kopachuck MS | Gig Harbor HS |

## P223 Report Parameters by Level

### Elementary

| Parameter | Value |
|-----------|-------|
| FTE Calculation Window | **1 Day** |
| Window Counting Method | Forward |
| FTE Calculation Date | **Count Date** (required for 1-Day) |
| Calculate Elementary FTE | Calculate (checked) |

### Middle School & High School

| Parameter | Value |
|-----------|-------|
| FTE Calculation Window | **5 Day** |
| Window Counting Method | Forward |
| FTE Calculation Date | **Leave blank** |
| Calculate Elementary FTE | Calculate (checked — needed for 6th graders) |

## Backup Report Requirements by Level

### Elementary (5 reports)
1. Enrollment Summary
2. Student List Export (template: "(Dist) Enrollment - Monthly Backup Student List")
3. Class Attendance Audit (Period 1 only)
4. Entry/Exit Report (current + previous month)
5. Consecutive Absence Report (20 days, all codes)

### Middle & High School (6 reports)
All 5 elementary reports PLUS:
6. Student Schedule Report (3 per page, count date, save as PDF)

**Note**: At secondary, Class Attendance Audit runs Periods 1-6 (not just Period 1).

## Reporting Points of Contact

| Building/Program | Position | Report Type |
|-----------------|----------|-------------|
| Elementary Schools | Office Manager | Monthly Enrollment (TK/K-5) |
| Middle Schools | Office Manager | Monthly Enrollment |
| GHHS / PHS | Registrar | General Ed + Running Start |
| Henderson Bay | Office Manager | General Ed + Running Start |
| GVA | Counseling Secretary | ALE (Fresh Start under Open Doors) |
| CTP | Program Teachers | General Ed under PAP |
| English Learners | StuSvs Secretary | TBIP |
| CTE (CCLR) | Secretary | Vocational Enhanced Enrollment |
| Special Education | SpEd Data Compliance | SpEd PK-12 (Ancillary/Itinerant) |
| Compliance | Office of CFO | K-3 Class Size, ALE |

## Key Google Drive Locations

- **Shared Google Drive > ESC Business Services > Enrollment** — Main enrollment folder
- **SY ANNAVG** — Annual average tracking
- **SY CNTRL** — Monthly control spreadsheet
- **One Pager** — Summary document
- **K5 CLASS SIZE** folder — K-5 class size tracking
- **ALE_GVA > ALE Reported to OSPI** — ALE reporting history
- **Fresh Start** folder — Open Doors/Fresh Start running lists
- **BACKUP** folder — Monthly backup subfolders (ES, MS, HS)
- **RSCNTRL** — Running Start control spreadsheet
- **Part Time Spreadsheet** — District-maintained list of all part-time/adjusted FTE students

## Count Day Schedule

| Month | Count Day Rule |
|-------|---------------|
| September | 4th school day of September |
| October–June | 1st school day of each month |

### 2026-27 Count Dates (computed from official district calendar, weekdays verified)

Source: 2026-27 PSD calendar (first day 9/2/2026; Labor Day 9/7; winter break 12/21–12/31). Same table lives in the tracking sheet's `Calendar` tab for n8n and cross-machine use.

| Month | Count Date | Weekday | Notes |
|-------|-----------|---------|-------|
| September 2026 | 2026-09-08 | Tuesday | 4th school day; **also first day of kindergarten** |
| October 2026 | 2026-10-01 | Thursday | |
| November 2026 | 2026-11-02 | Monday | Nov 1 is a Sunday |
| December 2026 | 2026-12-01 | Tuesday | |
| January 2027 | 2027-01-04 | Monday | First school day after winter break |
| February 2027 | 2027-02-01 | Monday | |
| March 2027 | 2027-03-01 | Monday | |
| April 2027 | 2027-04-01 | Thursday | Spring break 4/12–4/16 is later in month |
| May 2027 | 2027-05-03 | Monday | May 1 is a Saturday |
| June 2027 | 2027-06-01 | Tuesday | Final count of the year |

## Reporting Deadlines

| Level | Template Due | Admin Meeting |
|-------|-------------|---------------|
| Elementary | 1:00 PM | 2:30 PM |
| Middle School | 2:00 PM | 3:15 PM |
| High School | 1:30 PM | 3:15 PM |
