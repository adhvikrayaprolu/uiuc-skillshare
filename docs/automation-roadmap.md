# Readiness roadmap

PR #7 is merged; issues #1–#3 are closed. The approved user-ready implementation is a dependency-ordered draft stack, PRs #17–#26. Main does not contain this stack until human review and merge.

The [readiness tracker #5](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/5) records issues, PR bases, verification and remaining integration limits. Issue #4 covers browser/mobile/accessibility evidence; #8–#16 cover security through final readiness. Do not recreate any work already represented by these drafts.

Next action: human review in stack order. Live Google/SMTP/Supabase and paid semantic verification require separate credentials/authorization. Infrastructure cannot be marked STABLE on main until the accepted implementation and relevant CI/setup evidence are present. Never merge, deploy or provision services automatically.
