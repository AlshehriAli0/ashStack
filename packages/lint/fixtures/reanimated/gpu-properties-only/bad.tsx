import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export function BadGpu() {
  const progress = useSharedValue(0);
  const grow = useAnimatedStyle(() => ({ height: progress.get() * 100 }));
  return <Animated.View style={grow} />;
}
