import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export function GoodInterpolate() {
  const offset = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get(), [0, 100], [1, 0], Extrapolation.CLAMP),
  }));
  return <Animated.View style={fade} />;
}
