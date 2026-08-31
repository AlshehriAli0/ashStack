import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function BadNesting() {
  return (
    <View style={styles.outer}>
      <View style={styles.inner} />
    </View>
  );
}

const styles = StyleSheet.create({ outer: {}, inner: {} });
