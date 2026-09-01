import { View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

export function Panel() {
  const { theme } = useUnistyles();

  return <View accessibilityLabel={String(theme.screen.width)} />;
}

export const Card = () => {
  const { theme } = useUnistyles();

  return <View accessibilityLabel={String(theme.screen.height)} />;
};
