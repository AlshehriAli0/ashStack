import worklets from "../packages/lint/dist/react-native/rules/worklets/index.js";
import { moduleTests } from "./harness.js";

const IMPORTS = `import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  runOnRuntimeSync,
  runOnUIAsync,
  runOnUISync,
  scheduleOnRuntime,
  scheduleOnUI,
} from "react-native-worklets";
`;

moduleTests(worklets, {
  "no-runtime-in-render": {
    valid: [
      {
        name: "a runtime created at module scope",
        code: `${IMPORTS}const worker = createWorkletRuntime({ name: "worker" });\nexport const Screen = () => <>{String(worker)}</>;\n`,
      },
      {
        name: "a runtime created in a plain function",
        code: `${IMPORTS}export function startWorker() {\n  return createWorkletRuntime({ name: "worker" });\n}\n`,
      },
      {
        name: "a function named like a hook prefix without the capital",
        code: `${IMPORTS}export const user = () => createWorkletRuntime("worker");\n`,
      },
    ],
    invalid: [
      {
        name: "inside a component declaration",
        code: `${IMPORTS}export function Screen() {\n  const worker = createWorkletRuntime({ name: "worker" });\n  return <>{String(worker)}</>;\n}\n`,
        errors: [
          {
            message: "Inside a component or hook, each `createWorkletRuntime` call starts a new JavaScript runtime",
            line: 11,
            column: 18,
          },
        ],
      },
      {
        name: "inside an arrow hook",
        code: `${IMPORTS}export const useWorker = () => createWorkletRuntime("worker");\n`,
        errors: [{ message: "Create this runtime once at module scope", line: 10 }],
      },
      {
        name: "inside an effect in a component",
        code: `import { useEffect } from "react";\n${IMPORTS}export const Screen = () => {\n  useEffect(() => {\n    createWorkletRuntime("worker");\n  }, []);\n  return null;\n};\n`,
        errors: [{ message: "Create this runtime once at module scope", line: 13 }],
      },
      {
        name: "a namespace call",
        code: `import * as Worklets from "react-native-worklets";\nexport function useWorker() {\n  return Worklets.createWorkletRuntime("worker");\n}\n`,
        errors: [{ message: "Create this runtime once at module scope", line: 3 }],
      },
    ],
  },

  "no-inline-worklet-schedule": {
    valid: [
      {
        name: "a named worklet with arguments",
        code: `${IMPORTS}function logValue(value: number) {\n  "worklet";\n  console.log(value);\n}\nexport function onPress(value: number) {\n  scheduleOnUI(logValue, value);\n}\n`,
      },
      {
        name: "an inline worklet at module scope, which runs once",
        code: `${IMPORTS}declare function tick(): void;\nconst worker = createWorkletRuntime("worker");\nscheduleOnRuntime(worker, () => {\n  "worklet";\n  setInterval(tick, 100);\n});\n`,
      },
      {
        name: "an inline function in the runtime position is not the worklet",
        code: `${IMPORTS}declare function work(): void;\nexport function run() {\n  scheduleOnRuntime(createWorkletRuntime("w"), work);\n}\n`,
      },
      {
        name: "an unrelated call taking an inline function",
        code: `export function onPress() {\n  requestAnimationFrame(() => {\n    "worklet";\n  });\n}\n`,
      },
    ],
    invalid: [
      {
        name: "the inline worklet from the docs",
        code: `${IMPORTS}export function onPress(value: number) {\n  scheduleOnUI((value) => {\n    "worklet";\n    console.log(value);\n  }, value);\n}\n`,
        errors: [
          {
            message:
              "pass what it needs as `scheduleOnUI`'s extra arguments. A new function object here is serialized on every call.",
            line: 11,
            column: 16,
          },
        ],
      },
      {
        name: "a wrapper worklet that forwards its closure",
        code: `${IMPORTS}declare function foo(a: number, b: number): void;\nexport function schedule(a: number, b: number) {\n  scheduleOnUI(() => {\n    "worklet";\n    foo(a, b);\n  });\n}\n`,
        errors: [{ message: "Define this worklet once", line: 12 }],
      },
      {
        name: "an inline function without the directive, which the plugin workletizes anyway",
        code: `${IMPORTS}declare function foo(a: number): void;\nexport function schedule(a: number) {\n  scheduleOnUI(() => foo(a));\n}\n`,
        errors: [{ message: "Define this worklet once", line: 12, column: 16 }],
      },
      {
        name: "the worklet position of each runtime call",
        code: `${IMPORTS}declare const worker: Parameters<typeof scheduleOnRuntime>[0];\nexport async function run(a: number) {\n  scheduleOnRuntime(worker, () => {\n    "worklet";\n    return a;\n  });\n  await runOnRuntimeAsync(worker, function work() {\n    "worklet";\n    return a;\n  });\n  await runOnUIAsync(() => a);\n}\n`,
        errors: [
          { message: "`scheduleOnRuntime`'s extra arguments", line: 12, column: 29 },
          { message: "`runOnRuntimeAsync`'s extra arguments", line: 16, column: 35 },
          { message: "`runOnUIAsync`'s extra arguments", line: 20, column: 22 },
        ],
      },
      {
        name: "a sync call with an inline worklet",
        code: `${IMPORTS}export function read(a: number) {\n  return runOnUISync(() => a);\n}\n`,
        errors: [{ message: "`runOnUISync`'s extra arguments" }],
      },
      {
        name: "inside a component's handler",
        code: `${IMPORTS}export const Button = ({ title }: { title: string }) => {\n  const onPress = () => scheduleOnUI(() => console.log(title));\n  return <button onClick={onPress}>{title}</button>;\n};\n`,
        errors: [{ line: 11 }],
      },
    ],
  },

  "no-sync-runtime-call": {
    valid: [
      `${IMPORTS}declare function measure(): number;\nexport const read = () => runOnUIAsync(measure);\n`,
      {
        name: "a local function with a Sync suffix",
        code: `declare function saveSync(): void;\nexport const save = () => saveSync();\n`,
      },
    ],
    invalid: [
      {
        name: "runOnUISync",
        code: `${IMPORTS}declare function measure(): number;\nexport const read = () => runOnUISync(measure);\n`,
        errors: [
          {
            message: "Call `runOnUIAsync` and await the result. `runOnUISync` blocks the calling thread",
            line: 11,
            column: 27,
          },
        ],
      },
      {
        name: "runOnRuntimeSync, even at module scope",
        code: `${IMPORTS}declare function measure(): number;\nconst worker = createWorkletRuntime("worker");\nexport const size = runOnRuntimeSync(worker, measure);\n`,
        errors: [{ message: "Call `runOnRuntimeAsync`", line: 12, column: 21 }],
      },
      {
        name: "runOnRuntimeSyncWithId",
        code: `import { runOnRuntimeSyncWithId } from "react-native-worklets";\ndeclare function measure(): number;\nexport const size = runOnRuntimeSyncWithId(1, measure);\n`,
        errors: [{ message: "Call `runOnRuntimeAsyncWithId`" }],
      },
    ],
  },

  "no-js-timer-schedule": {
    valid: [
      {
        name: "the timer started on the target runtime",
        code: `${IMPORTS}declare function tick(): void;\nconst worker = createWorkletRuntime("worker");\nfunction startTicking() {\n  "worklet";\n  setInterval(tick, 100);\n}\nexport const start = () => scheduleOnRuntime(worker, startTicking);\n`,
      },
      {
        name: "a timer that does JS-thread work",
        code: `declare function refresh(): void;\nsetInterval(() => {\n  refresh();\n}, 1000);\n`,
      },
      {
        name: "a schedule inside a nested callback of the timer",
        code: `${IMPORTS}declare function tick(i: number): void;\ndeclare const items: number[];\nsetTimeout(() => {\n  items.forEach(i => scheduleOnUI(tick, i));\n}, 0);\n`,
      },
      {
        name: "a timer inside a worklet, which runs on that runtime's event loop",
        code: `${IMPORTS}declare function draw(): void;\nexport function startDrawing() {\n  "worklet";\n  setInterval(() => scheduleOnUI(draw), 16);\n}\n`,
      },
      {
        name: "a timer inside a scheduled worklet without the directive",
        code: `${IMPORTS}declare function draw(): void;\nconst worker = createWorkletRuntime("worker");\nscheduleOnRuntime(worker, () => setInterval(() => scheduleOnUI(draw), 16));\n`,
      },
      {
        name: "a schedule in the delay position is not in the callback",
        code: `${IMPORTS}declare function tick(): void;\ndeclare function delay(fn: () => void): number;\nsetTimeout(tick, delay(() => scheduleOnUI(tick)));\n`,
      },
    ],
    invalid: [
      {
        name: "the setInterval from the docs",
        code: `${IMPORTS}declare function tick(): void;\nconst worker = createWorkletRuntime("worker");\nsetInterval(() => {\n  scheduleOnRuntime(worker, tick);\n}, 100);\n`,
        errors: [{ message: "`scheduleOnRuntime` a worklet that calls `setInterval` there.", line: 13, column: 3 }],
      },
      {
        name: "a setTimeout with a function expression",
        code: `${IMPORTS}declare function tick(): void;\nexport function later() {\n  setTimeout(function () {\n    scheduleOnUI(tick);\n  }, 16);\n}\n`,
        errors: [{ message: "A `setTimeout` on the React Native Runtime waits for the JavaScript thread", line: 13 }],
      },
      {
        name: "a concise arrow body through globalThis",
        code: `${IMPORTS}declare function tick(): void;\nglobalThis.setInterval(() => scheduleOnUI(tick), 16);\n`,
        errors: [{ message: "sends a new job each time it fires", line: 11, column: 30 }],
      },
    ],
  },
});
