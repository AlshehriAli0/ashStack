---
"@ashstack/lint": minor
---

Add `@ashstack/unistyles/no-paramless-dynamic-function`. A style written as `() => ({ ... })` returns the same object on every render, and `theme` and `rt` reach a static style anyway, so the function only adds a call at each use site. The suggestion turns it back into the object.
