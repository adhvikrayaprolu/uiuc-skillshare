# Finding a suitable helper

Eligibility and privacy are applied before retrieval: active Illinois-email members, published profiles, willingness to help, and no block in either direction. Explicit skills, categories, availability and background filters constrain every branch. Approved skill names and staff-managed aliases retrieve candidates independently of PostgreSQL full-text search. A bounded union is ranked deterministically; semantic retrieval is separately gated. The response reports the matching mode, fallback reason and whether the 200-candidate limit applies. Pagination counts describe this bounded result set, not every possible profile.

Ranking uses 75% relevance, 10% availability, 10% completed-interaction feedback and 5% recently confirmed willingness. Relevance uses 60% offered-skill evidence, 25% semantic similarity and 15% text relevance; without semantic matching these become 80% skill evidence and 20% text. Exact requested skills take precedence over adjacent matches. Five neutral feedback observations keep newcomers from being penalized. Major/year are explicit filters only. Profile edits and popularity do not increase relevance. Explanations report offered skills, actual availability and completed-request feedback, never confidence percentages or verified expertise.

Recommendations use private learning goals locally. Members without goals see labeled discovery suggestions. Search text includes offered-skill names/descriptions, headline and bio; no contacts, authentication emails, private goals, credential contents, demographics or scraped links. Private/inactive/deleted profiles lose their search index. Paid AI defaults off; keyword/taxonomy search remains available.

## Local evaluation

`make check` includes 30 labeled task fixtures covering React collaboration, resume feedback and research advice, with alternate phrasing. Suitable offered-skill helpers appeared in the top three for 30/30 covered tasks on a corpus of 225 peers. Ambiguous/irrelevant and privacy cases are separate regressions. This synthetic set is a reproducible regression baseline, not evidence for every skill or live semantic quality.

On Docker PostgreSQL 16, a before/after benchmark of 225 synthetic published helpers (one offered skill each; ranking plus the first 20 cards) measured:

| Implementation | Queries | Time | Ranked candidates |
| --- | ---: | ---: | ---: |
| Previous per-profile scorer | 1,458 | 398.0 ms | 225 |
| Bounded scorer with shared prefetch | 8 | 32.7 ms | 200 |

Single-run local measurements include the intentional candidate bound; they are not hosting latency guarantees. The automated test records five samples and enforces a query budget without asserting machine-dependent timing. PostgreSQL uses an English full-text GIN index. SQLite is a native-development fallback and does not exercise that index. Live semantic relevance remains unverified until separate paid-call approval.
