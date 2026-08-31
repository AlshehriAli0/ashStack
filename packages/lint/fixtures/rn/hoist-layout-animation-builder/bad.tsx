import Animated, { FadeIn } from "react-native-reanimated";

export function BadLayoutBuilder() {
  return <Animated.View entering={FadeIn.duration(250)} />;
}
