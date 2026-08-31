import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useAnimatedTheme } from "react-native-unistyles/reanimated";

export function Fade() {
  const animatedTheme = useAnimatedTheme();
  const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: animatedTheme.value.colors.accent }));

  return <Animated.View style={animatedStyle} />;
}
