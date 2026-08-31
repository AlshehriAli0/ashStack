import { I18nManager, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function Row() {
  return <View style={styles.row(I18nManager.isRTL)} />;
}

const styles = StyleSheet.create({
  row: (rtl: boolean) => ({ transform: [{ scaleX: rtl ? -1 : 1 }] }),
});
