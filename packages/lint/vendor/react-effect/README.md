# eslint-plugin-react-you-might-not-need-an-effect

Vendored verbatim at **1.0.2**, MIT, from
https://github.com/NickvanDyke/eslint-plugin-react-you-might-not-need-an-effect

`index.mjs` is its published `dist/index.mjs`, unmodified. `LICENSE` is its own.

## Why it is here

Depending on the package installs 12.3 MB across 60 packages, because it
declares `eslint` as a non-optional peer and npm installs peers. Its code never
imports eslint — oxlint loads it through its own plugin bridge — so the whole
ESLint tree sat in every consumer's `node_modules` without ever running. The
file itself is 32 KB and imports only `globals`, which stays a dependency.

## Updating

    npm pack eslint-plugin-react-you-might-not-need-an-effect@<version>
    tar xzf eslint-plugin-*.tgz
    bun run vendor:effects --from=package/dist/index.mjs

Then update the version above. `scripts/vendor-effects.ts` drops the config
presets and the `globals` import they need, and refuses to write a file that
still imports anything. `tests/effects.test.ts` fails if the rule ids this
package enables stop matching the ones the file exports.
