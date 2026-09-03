---
"@ashstack/lint": patch
---

Shorten every diagnostic message. Each one now leads with the fix, keeps only the alternatives that change which fix you pick, and drops the mechanism prose the rule docs already carry. The rewritten messages went from a 181-character median to 134, and the longest dropped from 524 to 190 — the difference between an agent acting on a message and skimming it.
