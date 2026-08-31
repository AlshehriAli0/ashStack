import { ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function List() {
  return <ScrollView contentContainerStyle={styles.content} />;
}

const styles = StyleSheet.create((theme, rt) => ({
  content: { paddingBottom: rt.insets.bottom },
}));
