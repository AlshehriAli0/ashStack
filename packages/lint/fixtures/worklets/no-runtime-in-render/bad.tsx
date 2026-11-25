import { createWorkletRuntime, scheduleOnRuntime } from "react-native-worklets";

declare function processData(data: string): void;

export function useBackgroundProcessing(data: string) {
  const worker = createWorkletRuntime({ name: "worker" });
  return () => scheduleOnRuntime(worker, processData, data);
}
