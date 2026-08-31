import { View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

export function Panel() {
  const { theme } = useUnistyles();

  return <View accessibilityLabel={String(theme.screen.width)} />;
}
