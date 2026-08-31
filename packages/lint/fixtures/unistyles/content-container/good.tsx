import { ScrollView } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

const UnistylesScrollView = withUnistyles(ScrollView);

export function List() {
  return <UnistylesScrollView contentContainerStyle={styles.content} />;
}

const styles = StyleSheet.create((theme, rt) => ({
  content: { paddingBottom: rt.insets.bottom },
}));
