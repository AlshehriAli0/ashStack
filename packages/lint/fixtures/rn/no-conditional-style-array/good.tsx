import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function GoodStyleArray({ active }: { active: boolean }) {
  return <View style={styles.card(active)} />;
}

const styles = StyleSheet.create({
  card: (active: boolean) => ({ opacity: active ? 1 : 0.5 }),
});
