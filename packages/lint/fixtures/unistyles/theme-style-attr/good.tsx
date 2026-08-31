import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function Badge() {
  return <View style={styles.badge} />;
}

const styles = StyleSheet.create(theme => ({
  badge: { backgroundColor: theme.colors.accent },
}));
