import { useSharedValue } from "react-native-reanimated";

declare function computeInitialProgress(): number;

export function useBadInitializer() {
  return useSharedValue(computeInitialProgress());
}
