import { View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

export function Badge() {
  const { theme } = useUnistyles();

  return <View style={{ backgroundColor: theme.colors.accent }} />;
}
