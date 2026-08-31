import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export function GoodAnimatedStyleHost() {
  const progress = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return <Animated.View style={fade} />;
}
