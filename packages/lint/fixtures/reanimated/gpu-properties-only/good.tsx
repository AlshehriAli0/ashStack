import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export function GoodGpu() {
  const progress = useSharedValue(0);
  const slide = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: progress.get() * 10 }],
  }));
  return <Animated.View style={slide} />;
}
