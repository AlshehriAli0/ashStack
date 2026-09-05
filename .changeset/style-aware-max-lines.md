---
"@ashstack/lint": minor
---

Replace the built-in `max-lines` with `@ashstack/core/max-lines`, which counts neither blank lines, comments, nor the style tables `StyleSheet.create` and `stylex.create` build. Colocating a stylesheet with the component it styles is the point, and a stylesheet is data — it was spending a budget meant for decisions. The cap stays 300 in `core()` and tightens to 250 from `react()` down, where a file past it is several components rather than one long one.
