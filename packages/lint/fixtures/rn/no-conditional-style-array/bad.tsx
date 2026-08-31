import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function BadStyleArray({ active }: { active: boolean }) {
  return <View style={[styles.card, active && styles.cardActive]} />;
}

const styles = StyleSheet.create({ card: {}, cardActive: {} });
