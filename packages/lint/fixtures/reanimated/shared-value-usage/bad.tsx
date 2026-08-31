import { Text } from "react-native";
import { useSharedValue } from "react-native-reanimated";

export function BadSharedValueUsage() {
  const progress = useSharedValue(0);
  return <Text>{progress.get()}</Text>;
}
