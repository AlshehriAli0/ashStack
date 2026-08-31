import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function Card() {
  return <View style={{ ...styles.card, opacity: 1 }} />;
}

const styles = StyleSheet.create(theme => ({
  card: { backgroundColor: theme.colors.surface },
}));
