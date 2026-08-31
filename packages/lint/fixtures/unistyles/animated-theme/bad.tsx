import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

export function Fade() {
  const { theme } = useUnistyles();
  const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: theme.colors.accent }));

  return <Animated.View style={animatedStyle} />;
}
