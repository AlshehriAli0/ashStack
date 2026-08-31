import { fileURLToPath } from "node:url";

// jsPlugins are resolved by oxlint relative to the CONSUMER's config, where our
// plugin files may not be reachable (pnpm, nested installs). Resolving to
// absolute paths here — from this package's own location — works from anywhere.
// `relative` is a path from the package root, e.g. "core/rules/ash.js".
export const ownPlugin = relative => fileURLToPath(new URL(`../${relative}`, import.meta.url));
