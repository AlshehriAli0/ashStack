import { Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export function GoodSharedValueUsage() {
  const progress = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return (
    <Animated.View style={fade}>
      <Text>Loading</Text>
    </Animated.View>
  );
}
