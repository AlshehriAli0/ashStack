import { useFrameCallback } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

declare function report(value: number): void;

export function useGoodSchedule() {
  useFrameCallback(() => {
    scheduleOnRN(report, 1);
  });
}
