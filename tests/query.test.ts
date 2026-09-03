import query from "../packages/lint/dist/react/rules/query/index.js";
import { moduleTests } from "./harness.js";

moduleTests(query, {
  "next-page-param-undefined": {
    valid: [
      {
        name: "returning undefined is the shape this rule asks for",
        code: "const options = { getNextPageParam: last => last.cursor ?? undefined };",
      },
      {
        name: "returning a non-null literal",
        code: "const options = { getNextPageParam: () => 0 };",
      },
      {
        name: "a computed getNextPageParam key is a different key",
        code: `
const options = {
  [getNextPageParam]: () => {
    return null;
  },
};
`,
      },
      {
        name: "return null written only in a comment",
        code: `
const options = {
  getNextPageParam: lastPage => {
    // never return null here
    return lastPage.cursor ?? undefined;
  },
};
`,
      },
      {
        name: "return null inside a nested helper is not this function's return",
        code: `
const options = {
  getNextPageParam: lastPage => {
    const pick = () => {
      return null;
    };
    return pick() ?? undefined;
  },
};
`,
      },
      {
        name: "a newline after return ends the statement, so nothing returns null",
        code: `
const options = {
  getNextPageParam: () => {
    return
      null;
  },
};
`,
      },
      {
        name: "returns undefined for the last page",
        code: `
import { useInfiniteQuery } from "@tanstack/react-query";

export const useFeed = () =>
  useInfiniteQuery({
    queryKey: feedKeys.all(),
    queryFn: ({ pageParam }) => loadFeed(pageParam),
    initialPageParam: 0,
    getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.cursor : undefined),
  });
`,
      },
      {
        name: "nullish coalescing without a return keyword",
        code: `
const options = {
  getNextPageParam: lastPage => lastPage.next ?? null,
};
`,
      },
      {
        name: "return of an identifier that merely starts with null",
        code: `
const options = {
  getNextPageParam: lastPage => {
    return nullish;
  },
};
`,
      },
      {
        name: "return null under a sibling key, marker present so the gate opens",
        code: `
const options = {
  getNextPageParam: lastPage => lastPage.cursor,
  getPreviousPageParam: firstPage => {
    return null;
  },
};
`,
      },
      {
        name: "getNextPageParam read as a value, never as a property key",
        code: `
const getNextPageParam = handlers.next;

export const build = () => {
  if (!getNextPageParam) {
    return null;
  }
  return getNextPageParam;
};
`,
      },
      {
        name: "documents the gate hole: an escaped key hides the marker from the source-text gate",
        code: `
const options = {
  "getNextPageP\\u0061ram": () => {
    return null;
  },
};
`,
      },
      {
        name: "no marker anywhere, the file is skipped wholesale",
        code: `
const options = {
  select: () => {
    return null;
  },
};
`,
      },
      {
        name: "a template literal computed key reads as no key at all",
        code: `
const options = {
  [\`getNextPageParam\`]: () => {
    return null;
  },
};
`,
      },
    ],
    invalid: [
      {
        name: "a concise arrow returning null",
        code: "const options = { getNextPageParam: () => null };",
        errors: 1,
      },
      {
        name: "shorthand method syntax is still a property",
        code: `
const options = {
  getNextPageParam() {
    return null;
  },
};
`,
        errors: 1,
      },
      {
        name: "arrow body returning null",
        code: `
import { useInfiniteQuery } from "@tanstack/react-query";

export const useFeed = () =>
  useInfiniteQuery({
    queryKey: feedKeys.all(),
    queryFn: ({ pageParam }) => loadFeed(pageParam),
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      return null;
    },
  });
`,
        errors: [{ message: "Return `undefined` to signal there are no more pages", line: 9, column: 23 }],
      },
      {
        name: "string literal key with a function expression value",
        code: `
const feedOptions = {
  queryKey: feedKeys.all(),
  "getNextPageParam": function (lastPage) {
    return null;
  },
};
`,
        errors: [{ message: /no more pages/, line: 4, column: 23 }],
      },
      {
        name: "extra whitespace between return and null",
        code: `
const options = {
  getNextPageParam: lastPage => {
    if (lastPage.done) {
      return  null;
    }
    return lastPage.cursor;
  },
};
`,
        errors: [{ line: 3, column: 21 }],
      },
      {
        name: "two option objects in one file report once each",
        code: `
const feed = {
  getNextPageParam: () => {
    return null;
  },
};

const inbox = {
  getNextPageParam: () => {
    return null;
  },
};
`,
        errors: [
          { line: 3, column: 21 },
          { line: 9, column: 21 },
        ],
      },
      {
        name: "an escaped key does report once the marker appears elsewhere in the file",
        code: `
const key = "getNextPageParam";

const options = {
  "getNextPageP\\u0061ram": () => {
    return null;
  },
};
`,
        errors: 1,
      },
    ],
  },

  "no-deprecated-filters": {
    valid: [
      {
        name: "a computed member named like a filter is a different method",
        code: 'client[invalidateQueries](["todos"]);',
      },
      {
        name: "the v5 filter object form",
        code: `
import { useQueryClient } from "@tanstack/react-query";

export const useRefresh = () => {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: todoKeys.all() });
};
`,
      },
      { name: "no arguments at all", code: "client.invalidateQueries();" },
      {
        name: "a positional key plus a second argument is left alone",
        code: 'client.invalidateQueries(["todos"], { cancelRefetch: true });',
      },
      { name: "an identifier argument cannot be rewritten", code: "client.invalidateQueries(filters);" },
      { name: "a template literal is not a string Literal", code: "client.invalidateQueries(`todos`);" },
      { name: "a number literal is not a string literal", code: "client.invalidateQueries(1);" },
      { name: "a spread argument", code: "client.invalidateQueries(...filters);" },
      { name: "a bare function call is not a member call", code: 'invalidateQueries(["todos"]);' },
      { name: "a method that is not in the filter set", code: 'client.fetchQueries(["todos"]);' },
      { name: "setQueryData is not a filter method", code: 'client.setQueryData(["todos"], next);' },
      { name: "a computed member with a string key", code: 'client["invalidateQueries"](["todos"]);' },
      { name: "a computed member whose identifier is not a filter name", code: 'client[method](["todos"]);' },
      { name: "an object argument that is already a filter", code: 'client.removeQueries({ queryKey: ["todos"] });' },
    ],
    invalid: [
      {
        name: "a positional array key",
        code: 'client.invalidateQueries(["todos", id]);',
        errors: [{ message: "v5 removed the positional form", line: 1, column: 26 }],
      },
      {
        name: "a positional string key",
        code: 'client.invalidateQueries("todos");',
        errors: [{ message: /filter object here/, line: 1, column: 26 }],
      },
      {
        name: "every filter method in the set",
        code: `
client.invalidateQueries(["a"]);
client.removeQueries(["b"]);
client.refetchQueries(["c"]);
client.cancelQueries(["d"]);
client.resetQueries(["e"]);
`,
        errors: [{ line: 2 }, { line: 3 }, { line: 4 }, { line: 5 }, { line: 6 }],
      },
      { name: "an empty array is still a positional key", code: "client.resetQueries([]);", errors: 1 },
      { name: "an empty string is still a positional key", code: 'client.cancelQueries("");', errors: 1 },
      {
        name: "the call may hang off any receiver",
        code: `
import { QueryClient } from "@tanstack/react-query";

export const client = new QueryClient();

export const clear = () => queryClient.resetQueries("session");
`,
        errors: [{ line: 6, column: 53 }],
      },
    ],
  },

  "no-fetch-in-query-fn": {
    valid: [
      {
        name: "a computed queryFn key is a different key",
        code: 'const options = { [queryFn]: () => fetch("/a") };',
      },
      {
        name: "a typed client's own fetch method",
        code: "const options = { queryFn: () => api.fetch(url) };",
      },
      {
        name: "fetch written only in a comment",
        code: "const options = { queryFn: () => { /* no fetch( here */ return read(url); } };",
      },
      {
        name: "the queryFn calls a typed request module",
        code: `
import { useQuery } from "@tanstack/react-query";

import { getTodos } from "./todos.requests";

export const useTodos = () => useQuery({ queryKey: todoKeys.all(), queryFn: () => getTodos() });
`,
      },
      { name: "the queryFn is a bare reference", code: "const options = { queryFn: fetchTodos };" },
      { name: "fetchTodos( is not fetch(", code: "const options = { queryFn: () => fetchTodos(id) };" },
      { name: "prefetchTodos( is not fetch(", code: "const options = { queryFn: () => prefetchTodos(id) };" },
      {
        name: "prefetch( ends in fetch( but has no word boundary",
        code: "const options = { queryFn: () => prefetch(url) };",
      },
      {
        name: "a mutationFn calling a request module",
        code: "const options = { mutationFn: input => saveTodo(input) };",
      },
      {
        name: "fetch under a sibling key, marker present so the gate opens",
        code: `
const options = {
  queryFn: () => getTodos(),
  select: data => fetch(data.href),
};
`,
      },
      {
        name: "no marker anywhere, the file is skipped wholesale",
        code: `
export const load = async () => {
  const response = await fetch("/api/todos");
  return response.json();
};
`,
      },
      {
        name: "documents the gate hole: an escaped key hides the marker from the source-text gate",
        code: `
const options = {
  "queryF\\u006e": () => fetch("/api/todos"),
};
`,
      },
      {
        name: "a template literal computed key reads as no key at all",
        code: 'const options = { [`queryFn`]: () => fetch("/a") };',
      },
    ],
    invalid: [
      {
        name: "shorthand method syntax is still a property",
        code: `
const options = {
  queryFn() {
    return fetch("/api/todos");
  },
};
`,
        errors: 1,
      },
      {
        name: "a bare fetch inside a queryFn",
        code: `
import { useQuery } from "@tanstack/react-query";

export const useTodos = () =>
  useQuery({
    queryKey: todoKeys.all(),
    queryFn: async () => {
      const response = await fetch("/api/todos");
      return response.json();
    },
  });
`,
        errors: [{ message: "`*.requests.ts` module here instead of `fetch`", line: 7, column: 14 }],
      },
      {
        name: "a bare fetch inside a mutationFn",
        code: `
const options = {
  mutationFn: (input: Todo) => fetch("/api/todos", { method: "POST", body: JSON.stringify(input) }),
};
`,
        errors: [{ message: /instead of `fetch`/, line: 3, column: 15 }],
      },
      {
        name: "whitespace between fetch and its parenthesis",
        code: "const options = { queryFn: () => fetch (url) };",
        errors: 1,
      },
      {
        name: "queryFn and mutationFn in one file report once each",
        code: `
const read = { queryFn: () => fetch("/a") };
const write = { mutationFn: () => fetch("/b") };
`,
        errors: [
          { line: 2, column: 25 },
          { line: 3, column: 29 },
        ],
      },
      {
        name: "a string literal key",
        code: 'const options = { "queryFn": () => fetch("/a") };',
        errors: 1,
      },
    ],
  },

  "no-inline-keys": {
    valid: [
      {
        name: "useQueries whose queries entry is not an array",
        code: "const results = useQueries({ queries: buildQueries() });",
      },
      {
        name: "useQueries whose nested keys come from a factory",
        code: "const results = useQueries({ queries: [{ queryKey: keys.todos() }] });",
      },
      {
        name: "a computed queryKey property is a different key",
        code: 'useQuery({ [queryKey]: ["todos"] });',
      },
      {
        name: "the key comes from a keys factory",
        code: `
import { useQuery } from "@tanstack/react-query";

import { todoKeys } from "./todos.keys";

export const useTodos = () => useQuery({ queryKey: todoKeys.all(), queryFn: getTodos });
`,
      },
      {
        name: "useMutation is not a query key hook",
        code: 'useMutation({ mutationKey: ["todos"], mutationFn: save });',
      },
      { name: "queryOptions is not in the hook set", code: 'const options = queryOptions({ queryKey: ["todos"] });' },
      { name: "getQueryData through a factory", code: "client.getQueryData(todoKeys.detail(1));" },
      { name: "setQueryData through a factory", code: "client.setQueryData(todoKeys.all(), next);" },
      { name: "a bare getQueryData call is not a method call", code: 'getQueryData(["todos"]);' },
      { name: "getQueryData with no arguments", code: "client.getQueryData();" },
      { name: "a template literal computed key is not a queryKey property", code: "useQuery({ [`queryKey`]: [id] });" },
      { name: "the hook takes a variable rather than an object literal", code: "useQuery(options);" },
      { name: "the hook takes no arguments", code: "useQueries();" },
      { name: "a spread carries the key in", code: "useQuery({ ...baseOptions, queryFn: getTodos });" },
      { name: "shorthand queryKey referencing a factory value", code: "useQuery({ queryKey, queryFn: getTodos });" },
      {
        name: "a positional array on a filter method is a different rule's problem",
        code: 'client.invalidateQueries(["todos"]);',
      },
      {
        name: "a member-call named like a hook is not the hook",
        code: 'client.useQuery({ queryKey: ["todos"] });',
      },
    ],
    invalid: [
      {
        name: "a key nested inside useQueries",
        code: 'useQueries({ queries: [{ queryKey: ["todos"], queryFn: getTodos }] });',
        errors: 1,
      },
      {
        name: "an inline key on useQuery",
        code: `
import { useQuery } from "@tanstack/react-query";

export const useTodos = (id: string) =>
  useQuery({
    queryKey: ["todos", id],
    queryFn: () => getTodos(id),
  });
`,
        errors: [{ message: "`*.keys.ts` factory and reference it", line: 6, column: 15 }],
      },
      {
        name: "every query key hook",
        code: `
useQuery({ queryKey: ["a"] });
useSuspenseQuery({ queryKey: ["b"] });
useInfiniteQuery({ queryKey: ["c"] });
useSuspenseInfiniteQuery({ queryKey: ["d"] });
useQueries({ queryKey: ["e"] });
`,
        errors: [{ line: 2 }, { line: 3 }, { line: 4 }, { line: 5 }, { line: 6 }],
      },
      {
        name: "every query key method",
        code: `
client.invalidateQueries({ queryKey: ["a"] });
client.removeQueries({ queryKey: ["b"] });
client.refetchQueries({ queryKey: ["c"] });
client.cancelQueries({ queryKey: ["d"] });
client.resetQueries({ queryKey: ["e"] });
client.fetchQuery({ queryKey: ["f"], queryFn: load });
client.prefetchQuery({ queryKey: ["g"], queryFn: load });
client.ensureQueryData({ queryKey: ["h"], queryFn: load });
client.getQueriesData({ queryKey: ["i"] });
client.setQueriesData({ queryKey: ["j"] }, next);
`,
        errors: [
          { line: 2 },
          { line: 3 },
          { line: 4 },
          { line: 5 },
          { line: 6 },
          { line: 7 },
          { line: 8 },
          { line: 9 },
          { line: 10 },
          { line: 11 },
        ],
      },
      {
        name: "getQueryData gets its own message",
        code: 'const cached = client.getQueryData(["todos", id]);',
        errors: [{ message: "Read through the feature's `*.keys.ts` factory", line: 1, column: 36 }],
      },
      {
        name: "setQueryData gets its own message",
        code: 'client.setQueryData(["todos", id], next);',
        errors: [{ message: "Write through the feature's `*.keys.ts` factory", line: 1, column: 21 }],
      },
      { name: "a string literal queryKey property", code: 'useQuery({ "queryKey": ["todos"] });', errors: 1 },
      {
        name: "two queryKey properties in one options object report twice",
        code: 'useQuery({ queryKey: ["a"], queryFn: load, "queryKey": ["b"] });',
        errors: 2,
      },
      { name: "an empty inline key array", code: "useQuery({ queryKey: [] });", errors: 1 },
      { name: "an empty array on getQueryData", code: "client.getQueryData([]);", errors: 1 },
    ],
  },

  "require-destructured-hooks": {
    valid: [
      {
        name: "destructured at the call site",
        code: `
import { useTodosQuery } from "@/api/todos.queries";

export const TodoList = () => {
  const { data, isPending } = useTodosQuery();
  return <List items={data} pending={isPending} />;
};
`,
      },
      {
        name: "the hook comes from a module that is not an api hook module",
        code: `
import { useTodosQuery } from "./todos.hooks";

const query = useTodosQuery();
`,
      },
      {
        name: "a singular .query suffix does not match",
        code: `
import { useTodosQuery } from "@/api/todos.query";

const query = useTodosQuery();
`,
      },
      {
        name: "an extension after the suffix does not match",
        code: `
import { useTodosQuery } from "@/api/todos.queries.js";

const query = useTodosQuery();
`,
      },
      {
        name: "a different alias root does not match",
        code: `
import { useTodosQuery } from "~/api/todos.queries";

const query = useTodosQuery();
`,
      },
      {
        name: "a default import is not a named specifier",
        code: `
import useTodosQuery from "@/api/todos.queries";

const query = useTodosQuery();
`,
      },
      {
        name: "a namespace import is not a named specifier",
        code: `
import * as api from "@/api/todos.queries";

const query = api.useTodosQuery();
`,
      },
      {
        name: "a member callee is never a candidate",
        code: `
import { useTodosQuery } from "@/api/todos.queries";

const query = todos.useTodosQuery();
`,
      },
      {
        name: "the imported name is not hook-cased",
        code: `
import { usetodos } from "@/api/todos.queries";

const query = usetodos();
`,
      },
      {
        name: "an alias means the original name is not tracked",
        code: `
import { useTodosQuery as useTodos } from "@/api/todos.queries";

const query = useTodosQuery();
`,
      },
      {
        name: "an assignment is not a variable declarator",
        code: `
import { useTodosQuery } from "@/api/todos.queries";

let query;
query = useTodosQuery();
`,
      },
      {
        name: "the hook is referenced rather than called",
        code: `
import { useTodosQuery } from "@/api/todos.queries";

const query = useTodosQuery;
`,
      },
      {
        name: "an array pattern is not an identifier binding",
        code: `
import { useTodosQuery } from "@/api/todos.queries";

const [query] = [useTodosQuery()];
`,
      },
    ],
    invalid: [
      {
        name: "the whole result bound to one name",
        code: `
import { useTodosQuery } from "@/api/todos.queries";

export const TodoList = () => {
  const query = useTodosQuery();
  return <List items={query.data} />;
};
`,
        errors: [{ message: "Destructure this hook at the call site", line: 5, column: 9 }],
      },
      {
        name: "a mutations module",
        code: `
import { useCreateTodo } from "@/api/todos.mutations";

const mutation = useCreateTodo();
`,
        errors: [{ line: 4, column: 7 }],
      },
      {
        name: "the local alias is what gets tracked",
        code: `
import { useTodosQuery as useTodos } from "@/api/todos.queries";

const todos = useTodos();
`,
        errors: 1,
      },
      {
        name: "a nested path still matches the module pattern",
        code: `
import { useTodoQuery } from "@/api/todos/detail.queries";

const todo = useTodoQuery(id);
`,
        errors: 1,
      },
      {
        name: "two bound hooks report in source order",
        code: `
import { useTodosQuery } from "@/api/todos.queries";
import { useCreateTodo } from "@/api/todos.mutations";

export const Screen = () => {
  const todos = useTodosQuery();
  const create = useCreateTodo();
  return <List items={todos.data} onAdd={create.mutate} />;
};
`,
        errors: [
          { line: 6, column: 9 },
          { line: 7, column: 9 },
        ],
      },
      {
        name: "only the tracked specifier of a multi-specifier import reports",
        code: `
import { todoKeys, useTodosQuery } from "@/api/todos.queries";

const keys = todoKeys.all();
const query = useTodosQuery();
`,
        errors: [{ line: 5, column: 7 }],
      },
    ],
  },
});
