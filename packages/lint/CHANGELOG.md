# @ashstack/lint

## 0.5.1 (2026-09-02)

### Bug Fixes

- keep a rule's hover to one line ([`bcf2cbd`](https://github.com/AlshehriAli0/ashStack/commit/bcf2cbd))

## 0.5.0 (2026-09-02)

### Breaking Changes

- vendor the effect rules as `@ashstack/effects` ([`23b2237`](https://github.com/AlshehriAli0/ashStack/commit/23b2237))
- build a config from module metadata, not rule code ([`a259e5e`](https://github.com/AlshehriAli0/ashStack/commit/a259e5e))

### Features

- document every rule and entry on hover ([`99c47f1`](https://github.com/AlshehriAli0/ashStack/commit/99c47f1))

### Bug Fixes

- generate the opt-in rule list instead of retyping it ([`a13f8d6`](https://github.com/AlshehriAli0/ashStack/commit/a13f8d6))
- stop reporting one defect with two rules ([`8471f60`](https://github.com/AlshehriAli0/ashStack/commit/8471f60))

## 0.4.0 (2026-09-02)

### Breaking Changes

- require the entry subpath instead of the package root ([`968838e`](https://github.com/AlshehriAli0/ashStack/commit/968838e))
- make the effect plugin an optional peer ([`625d772`](https://github.com/AlshehriAli0/ashStack/commit/625d772))
- turn no-comments on by default ([`143301e`](https://github.com/AlshehriAli0/ashStack/commit/143301e))

### Features

- port the netzero web rules into three modules ([`788b1f6`](https://github.com/AlshehriAli0/ashStack/commit/788b1f6))
- trade two legend-list rules for the react-perf plugin ([`6bc1bba`](https://github.com/AlshehriAli0/ashStack/commit/6bc1bba))

### Bug Fixes

- **shared:** correct formatting of rule counts in README and update generation script ([`7658a44`](https://github.com/AlshehriAli0/ashStack/commit/7658a44))
- read the options a rule is actually given ([`6d31660`](https://github.com/AlshehriAli0/ashStack/commit/6d31660))
- let no-comments and no-manual-memo run in one project ([`1ba0878`](https://github.com/AlshehriAli0/ashStack/commit/1ba0878))
- stop requiring void on an unhandled promise ([`af175ee`](https://github.com/AlshehriAli0/ashStack/commit/af175ee))

### Performance

- ship declarations only for the exported entries ([`9b0f3fe`](https://github.com/AlshehriAli0/ashStack/commit/9b0f3fe))

## 0.3.1 (2026-09-02)

### Bug Fixes

- **shared:** ensure full history is fetched for accurate changelog generation ([`5a323c5`](https://github.com/AlshehriAli0/ashStack/commit/5a323c5))

## 0.3.0 (2026-09-02)

### Other Changes

- **shared:** build the changelog from the commits, not a typed summary ([`c5c6a0a`](https://github.com/AlshehriAli0/ashStack/commit/c5c6a0a))

## 0.2.0

### Minor Changes

- size decrease

## 0.1.1

### Patch Changes

- update Readme

## 0.1.0

### Minor Changes

- fc9d7f0: Initial release: core/react/react-native oxlint entries with the custom rule modules, and the shared oxfmt config.
