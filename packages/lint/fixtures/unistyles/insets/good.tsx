import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function Screen() {
  return <View style={styles.footer} />;
}

const styles = StyleSheet.create((theme, rt) => ({
  footer: { paddingBottom: rt.insets.bottom },
}));
