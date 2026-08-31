import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

export function Screen() {
  const insets = useSafeAreaInsets();

  return <View style={[styles.footer(insets.bottom), { paddingTop: insets.top }]} />;
}

const styles = StyleSheet.create({
  footer: (bottom: number) => ({ paddingBottom: bottom }),
});
