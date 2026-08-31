import { useSharedValue } from "react-native-reanimated";

declare function computeInitialProgress(): number;

export function useGoodInitializer() {
  return useSharedValue(() => computeInitialProgress());
}
