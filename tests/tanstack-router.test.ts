import tanstackRouter from "../packages/lint/dist/react/rules/tanstack-router/index.js";
import { moduleTests } from "./harness.js";

moduleTests(tanstackRouter, {
  "require-selector": {
    valid: [
      {
        name: "useLocation with a select",
        code: `import { useLocation } from "@tanstack/react-router";

export const Crumb = () => {
  const pathname = useLocation({ select: location => location.pathname });
  return <span>{pathname}</span>;
};
`,
      },
      {
        name: "useRouterState with a select",
        code: `import { useRouterState } from "@tanstack/react-router";

export const Pending = () => {
  const status = useRouterState({ select: state => state.status });
  return <span>{status}</span>;
};
`,
      },
      {
        name: "strict useSearch needs no select",
        code: `import { useSearch } from "@tanstack/react-router";

export const Filters = () => {
  const search = useSearch({ from: "/posts" });
  return <span>{String(search)}</span>;
};
`,
      },
      {
        name: "non-strict useSearch with a select",
        code: `import { useSearch } from "@tanstack/react-router";

export const Filters = () => {
  const page = useSearch({ strict: false, select: search => search.page });
  return <span>{String(page)}</span>;
};
`,
      },
      {
        name: "a useLocation from somewhere else entirely",
        code: `import { useLocation } from "react-router-dom";

export const Crumb = () => {
  const location = useLocation();
  return <span>{location.pathname}</span>;
};
`,
      },
      {
        name: "a non-strict flag that is not `strict`",
        code: `import { useSearch } from "@tanstack/react-router";

export const Filters = () => {
  const search = useSearch({ from: "/posts", shallow: false });
  return <span>{String(search)}</span>;
};
`,
      },
      {
        name: "strict set explicitly to true needs no select",
        code: `import { useSearch } from "@tanstack/react-router";

export const Filters = () => {
  const search = useSearch({ from: "/posts", strict: true });
  return <span>{String(search)}</span>;
};
`,
      },
      {
        name: "a strict:false nested in another option is not the hook's own",
        code: `import { useSearch } from "@tanstack/react-router";

export const Filters = () => {
  const search = useSearch({ from: "/posts", context: { strict: false } });
  return <span>{String(search)}</span>;
};
`,
      },
      {
        name: "someone else's function taking a strict flag",
        code: `import { useSearch } from "@tanstack/react-router";

declare const parse: (options: { strict: boolean }) => string;

export const Filters = () => {
  const page = useSearch({ strict: false, select: search => search.page });
  return <span>{parse({ strict: false }) + String(page)}</span>;
};
`,
      },
      {
        name: "a useLocation from react-router-dom in a file that also uses the router",
        code: `import { useLocation } from "react-router-dom";
import { useSearch } from "@tanstack/react-router";

export const Crumb = () => {
  const location = useLocation();
  const page = useSearch({ strict: false, select: search => search.page });
  return <span>{location.pathname + String(page)}</span>;
};
`,
      },
      {
        name: "a file that never imports the router",
        code: `export const useLocation = () => ({ pathname: "/" });

export const Crumb = () => <span>{useLocation().pathname}</span>;
`,
      },
    ],
    invalid: [
      {
        name: "useLocation with no argument",
        code: `import { useLocation } from "@tanstack/react-router";

export const Crumb = () => {
  const location = useLocation();
  return <span>{location.pathname}</span>;
};
`,
        errors: [{ message: "Pass a `select` that returns what this component reads", line: 4, column: 20 }],
      },
      {
        name: "useRouterState with no argument",
        code: `import { useRouterState } from "@tanstack/react-router";

export const Pending = () => {
  const state = useRouterState();
  return <span>{state.status}</span>;
};
`,
        errors: [{ message: "Pass a `select` that returns what this component reads", line: 4 }],
      },
      {
        name: "useLocation with options but no select",
        code: `import { useLocation } from "@tanstack/react-router";

export const Crumb = () => {
  const location = useLocation({ from: "/posts" });
  return <span>{location.pathname}</span>;
};
`,
        errors: [{ message: "Add a `select` returning the smallest value this component reads", line: 4 }],
      },
      {
        name: "non-strict useSearch with no select",
        code: `import { useSearch } from "@tanstack/react-router";

export const Filters = () => {
  const search = useSearch({ strict: false });
  return <span>{String(search)}</span>;
};
`,
        errors: [{ message: "subscribes to every route-search change", line: 4 }],
      },
      {
        name: "a quoted strict key still reads as strict",
        code: `import { useSearch } from "@tanstack/react-router";

export const Filters = () => {
  const search = useSearch({ "strict": false });
  return <span>{String(search)}</span>;
};
`,
        errors: [{ message: "subscribes to every route-search change", line: 4 }],
      },
      {
        name: "an aliased import is still the router hook",
        code: `import { useLocation as useRouterLocation } from "@tanstack/react-router";

export const Crumb = () => {
  const location = useRouterLocation();
  return <span>{location.pathname}</span>;
};
`,
        errors: [{ message: "Pass a `select` that returns what this component reads", line: 4 }],
      },
      {
        name: "a select nested in another call does not count as the hook's own",
        code: `import { useLocation } from "@tanstack/react-router";

declare const withDefaults: (options: unknown) => { from: string };

export const Crumb = () => {
  const location = useLocation(withDefaults({ select: (l: { pathname: string }) => l.pathname }));
  return <span>{location.pathname}</span>;
};
`,
        errors: [{ message: "Add a `select` returning the smallest value this component reads", line: 6 }],
      },
      {
        name: "two hooks in one file report twice",
        code: `import { useLocation, useRouterState } from "@tanstack/react-router";

export const Crumb = () => {
  const location = useLocation();
  const state = useRouterState();
  return <span>{location.pathname + state.status}</span>;
};
`,
        errors: [
          { message: "Pass a `select` that returns what this component reads", line: 4 },
          { message: "Pass a `select` that returns what this component reads", line: 5 },
        ],
      },
    ],
  },

  "no-search-casts": {
    valid: [
      {
        name: "a select instead of an assertion",
        code: `import { useSearch } from "@tanstack/react-router";

export const Paged = () => {
  const page = useSearch({ strict: false, select: search => search.page });
  return <span>{String(page)}</span>;
};
`,
      },
      {
        name: "an assertion on something unrelated",
        code: `import { useSearch } from "@tanstack/react-router";

declare const raw: unknown;

export const Paged = () => {
  const parsed = raw as { page: number };
  const search = useSearch({ from: "/posts" });
  return <span>{parsed.page + Number(search)}</span>;
};
`,
      },
      {
        name: "router.state.location.search read without an assertion",
        code: `import { useRouter } from "@tanstack/react-router";

export const Raw = () => {
  const router = useRouter();
  return <span>{String(router.state.location.search)}</span>;
};
`,
      },
      {
        name: "a router path that stops short of search",
        code: `import { useRouter } from "@tanstack/react-router";

export const Raw = () => {
  const router = useRouter();
  return <span>{router.state.location.pathname as string}</span>;
};
`,
      },
      {
        name: "a search read off something that is not the router state",
        code: `import { useRouter } from "@tanstack/react-router";

export const Raw = () => {
  const router = useRouter();
  return <span>{router.state.search as string}</span>;
};
`,
      },
      {
        name: "the router path shape on something that is not the router",
        code: `import { useRouter } from "@tanstack/react-router";

declare const store: { state: { location: { search: string } } };

export const Raw = () => {
  const router = useRouter();
  return <span>{String(router.state.status) + (store.state.location.search as string)}</span>;
};
`,
      },
      {
        name: "a state.location.search on something that is not a router",
        code: `declare const store: { state: { location: { search: unknown } } };

export const Raw = () => <span>{String(store.state.location.search as string)}</span>;
`,
      },
    ],
    invalid: [
      {
        name: "an assertion on a useSearch result",
        code: `import { useSearch } from "@tanstack/react-router";

interface Query {
  page: number;
}

export const Paged = () => {
  const search = useSearch({ strict: false }) as Query;
  return <span>{search.page}</span>;
};
`,
        errors: [{ message: "let the route's `validateSearch` schema type the result", line: 8, column: 18 }],
      },
      {
        name: "a doubled assertion still reports",
        code: `import { useSearch } from "@tanstack/react-router";

export const Paged = () => {
  const search = useSearch({ from: "/posts" }) as unknown as { page: number };
  return <span>{search.page}</span>;
};
`,
        errors: [{ message: "let the route's `validateSearch` schema type the result", line: 4 }],
      },
      {
        name: "an assertion on router.state.location.search",
        code: `import { useRouter } from "@tanstack/react-router";

export const Raw = () => {
  const router = useRouter();
  const query = router.state.location.search as { page: number };
  return <span>{query.page}</span>;
};
`,
        errors: [{ message: "read validated search through `useSearch({ from: ... })`", line: 5 }],
      },
      {
        name: "an assertion on the router call chained inline",
        code: `import { useRouter } from "@tanstack/react-router";

export const Raw = () => <span>{String(useRouter().state.location.search as string)}</span>;
`,
        errors: [{ message: "read validated search through `useSearch({ from: ... })`", line: 3 }],
      },
      {
        name: "a quoted segment reads the same as a dotted one",
        code: `import { useRouter } from "@tanstack/react-router";

export const Raw = () => {
  const router = useRouter();
  return <span>{router.state["location"].search as string}</span>;
};
`,
        errors: [{ message: "read validated search through `useSearch({ from: ... })`", line: 5 }],
      },
      {
        name: "an aliased useSearch is still the hook",
        code: `import { useSearch as useRouteSearch } from "@tanstack/react-router";

export const Paged = () => {
  const search = useRouteSearch({ strict: false }) as { page: number };
  return <span>{search.page}</span>;
};
`,
        errors: [{ message: "let the route's `validateSearch` schema type the result", line: 4 }],
      },
    ],
  },
});
