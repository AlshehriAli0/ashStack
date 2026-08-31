import { View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

export function Panel() {
  const { rt } = useUnistyles();

  return <View accessibilityLabel={String(rt.screen.width)} />;
}
