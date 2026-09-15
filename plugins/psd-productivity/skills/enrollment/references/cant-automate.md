# Items Requiring Human Judgment

> These items cannot be fully automated. The `/enrollment` skill will surface data,
> flag issues, and prepare files — but a human makes the final call.

## EDS State Submission

- **Why**: Legal requirement for human review before submission to state
- **Workaround**: Generate EDS-ready import file + comprehensive validation report. Human reviews and uploads.

## Principal Signature on Enrollment Report

- **Why**: Requires wet/digital signature on the Excel enrollment report template
- **Workaround**: Generate the completed enrollment report, flag it for signing. Principal signs manually.

## Student Services FTE Decisions

- **Why**: Ancillary/itinerant student FTE requires professional judgment about service time (OT, PT, etc.)
- **Workaround**: Surface the student data from the PK/Itinerant shared Google Sheet, present to enrollment officer for FTE determination.

## Building-Level "No Show" Phone Calls

- **Why**: Requires human phone calls to families during 1st 5 Days
- **Workaround**: Flag no-show students from attendance reports. Human follows up.

## TCC Running Start Report Arrival

- **Why**: External dependency — Tacoma Community College sends monthly enrollment report on their own schedule
- **Workaround**: Process the RS reconciliation when the report arrives. Alert if report is overdue.

## AES/IAES Coordinator Reconciliation

- **Why**: Cross-department coordination between enrollment and Student Services for alternative education placements
- **Workaround**: Flag discrepancies between Part Time spreadsheet and IAES coordinator spreadsheet for human review.

## Choice Transfer / Interdistrict Agreement Decisions

- **Why**: Policy and judgment calls about student placement, district agreements
- **Workaround**: Pull current list from Choice Transfer application, present data, human decides FTE split.

## Grade Level Changes Affecting Previous Counts

- **Why**: When a student's grade level is changed retroactively (e.g., retention decision), it may affect previous month's numbers. Requires judgment on whether a revision is needed.
- **Workaround**: Detect via month-over-month Enrollment Summary comparison, flag for human review.

## Backdated Exit Date Decisions

- **Why**: When learning a student moved earlier than originally known, the office manager enters a backdated exit. The decision of what date to use and whether to submit a revision involves judgment.
- **Workaround**: Detect backdated exits crossing count days, flag for revision. Human determines correct date and submits.

## Part-Time Student FTE Calculations (Edge Cases)

- **Why**: Some FTE decisions involve judgment — e.g., a student with a full schedule but only attending part-time with a tutor (AES/emergency removal). Time-based calculation requires knowing actual attendance pattern.
- **Workaround**: Flag the student, present available data, human makes FTE determination.

## Preschool Students on IEP

- **Why**: Reported by Student Services, not buildings. Requires coordination when PK students are withdrawn with dates prior to count day.
- **Workaround**: Alert Special Ed Data Compliance when PK withdrawals cross count dates.

## January Semester Change SQEAF

- **Why**: Running Start students may temporarily exceed 1.30 combined FTE during term overlap (December/January). SQEAF form required to verify annual average compliance.
- **Workaround**: Identify over-1.30 students in December/January, generate SQEAF data, human completes form.

## K-3 Class Size Manual Entry

- **Why**: EDS K-3 Class Size application requires manual data entry (no import file)
- **Workaround**: Prepare the data from pivot tables, present in format ready for manual entry.

## CTP Enrollment Reconciliation

- **Why**: CTP teachers maintain their own enrollment, and district must reconcile. Requires back-and-forth communication.
- **Workaround**: Pull CTP data from PowerSchool (Track=B), send to teachers for review, process their updates.

## Fresh Start Student Eligibility

- **Why**: Grade and age eligibility verification for Open Doors program requires professional judgment
- **Workaround**: Flag new students in PowerSchool not on Fresh Start report for human investigation with HBHS registrar.
