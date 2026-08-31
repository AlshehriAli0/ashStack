import { useFrameCallback, useSharedValue } from "react-native-reanimated";

export function GoodWorkletState() {
  const visible = useSharedValue(false);

  useFrameCallback(() => {
    visible.set(true);
  });

  return null;
}
