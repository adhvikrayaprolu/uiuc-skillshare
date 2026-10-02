# Engineering workflow

Read [README](../README.md), [AGENTS](../AGENTS.md) and [tracker #5](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/5) before changing tooling. Audit open issues/PRs and preserve user work.

PR #7 is merged. The user-ready implementation is in ten dependent draft PRs (#17–#26), awaiting human review. Each PR names its issue, parent branch, checks and remaining limits. Main is not the final draft branch.

Use `make check`; distinguish local results from actual GitHub CI. CI runs all PR targets, locks dependency installation, limits permissions and audits dependencies. Dependabot groups weekly updates with small open-PR limits; it never auto-merges. Avoid duplicate issues and unnecessary tooling changes after the baseline is stable.
