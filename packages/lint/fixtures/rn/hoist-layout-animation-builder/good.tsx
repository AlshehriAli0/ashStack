import Animated, { FadeIn } from "react-native-reanimated";

const FADE_IN = FadeIn.duration(250);

export function GoodLayoutBuilder() {
  return <Animated.View entering={FADE_IN} />;
}
