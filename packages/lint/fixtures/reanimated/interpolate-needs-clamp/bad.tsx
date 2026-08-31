import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export function BadInterpolate() {
  const offset = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: interpolate(offset.get(), [0, 100], [1, 0]) }));
  return <Animated.View style={fade} />;
}
