import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function Row() {
  return <View style={styles.row} />;
}

const styles = StyleSheet.create((theme, rt) => ({
  row: { flexDirection: rt.rtl ? "row-reverse" : "row" },
}));
