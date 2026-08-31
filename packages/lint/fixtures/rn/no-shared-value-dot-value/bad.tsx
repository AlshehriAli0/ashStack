import { useSharedValue } from "react-native-reanimated";

export function useBadDotValue() {
  const progress = useSharedValue(0);
  progress.value = 1;
  return progress.value;
}
