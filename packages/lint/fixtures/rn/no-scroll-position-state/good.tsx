import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

export function GoodScroll() {
  const offset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(event => {
    offset.set(event.contentOffset.y);
  });
  return <Animated.ScrollView onScroll={onScroll} />;
}
