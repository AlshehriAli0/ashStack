import { createWorkletRuntime, scheduleOnRuntime } from "react-native-worklets";

declare function processData(data: string): void;

const worker = createWorkletRuntime({ name: "worker" });

export function useBackgroundProcessing(data: string) {
  return () => scheduleOnRuntime(worker, processData, data);
}
