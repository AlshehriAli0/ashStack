import { createWorkletRuntime, scheduleOnRuntime } from "react-native-worklets";

declare function tick(): void;

const worker = createWorkletRuntime({ name: "worker" });

scheduleOnRuntime(worker, () => {
  "worklet";
  setInterval(tick, 100);
});
