import { defineModule } from "../../../lib/module.js";
import { naming } from "./naming.js";
import { noAssignment } from "./no-assignment.js";
import { noNestedObservable } from "./no-nested-observable.js";
import { noObjectSelector } from "./no-object-selector.js";
import { noObservableInComponent } from "./no-observable-in-component.js";
import { noPeekInSelector } from "./no-peek-in-selector.js";
import { noReactMirror } from "./no-react-mirror.js";
import { noUntrackedGetInJsx } from "./no-untracked-get-in-jsx.js";

export default defineModule({
  meta: { name: "@ashstack/legend-state" },
  url: import.meta.url,
  packages: ["@legendapp/state"],
  option: "legendState",
  docsWhen: "auto-enabled when `@legendapp/state` is a dependency",
  rules: {
    "no-assignment": noAssignment,
    naming: naming,
    "no-nested-observable": noNestedObservable,
    "no-react-mirror": noReactMirror,
    "no-untracked-get-in-jsx": noUntrackedGetInJsx,
    "no-peek-in-selector": noPeekInSelector,
    "no-object-selector": noObjectSelector,
    "no-observable-in-component": noObservableInComponent,
  },
  restrictedImports: {
    paths: [
      {
        name: "@legendapp/state/react",
        importNames: ["use$", "useSelector"],
        message: "Use `useValue` from `@legendapp/state/react`; `use$` and `useSelector` are deprecated.",
      },
    ],
  },
});
