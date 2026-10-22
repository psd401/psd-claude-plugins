# Files

- [CI, security scan, release and repo automation](ci-and-automation.md) - GitHub Actions in this repo: the org-reusable CI (gofmt/vet/shellcheck plus the four runnable test suites), security scan with gitleaks baseline, Claude review and @claude workflows, Go CLI release tags, the weekly OpenWiki update, and the validate-and-tag release ritual.
- [Cloud routines (triage, lfg, pr-fix)](cloud-routines.md) - How the three autonomous Claude Code cloud routines work: the shared psd-automation environment, in-session bootstrap that materializes plugin agents and skills, each routine's cadence, label state machine, protected-path rules and the manual copy-to-cloud update process.
