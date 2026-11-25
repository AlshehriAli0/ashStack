import { createWorkletRuntime, scheduleOnRuntime } from "react-native-worklets";

declare function tick(): void;

const worker = createWorkletRuntime({ name: "worker" });

setInterval(() => {
  scheduleOnRuntime(worker, tick);
}, 100);
