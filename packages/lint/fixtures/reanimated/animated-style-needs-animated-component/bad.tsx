import { View } from "react-native";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export function BadAnimatedStyleHost() {
  const progress = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return <View style={fade} />;
}
