import { Dimensions, I18nManager } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export const styles = StyleSheet.create(theme => ({
  card: {
    position: "absolute" as const,
    borderRadius: theme.radius.md,
    shadowColor: theme.colors.shadow,
    paddingLeft: theme.spacing[4],
    width: Dimensions.get("window").width,
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    paddingBottom: UnistylesRuntime.insets.bottom,
  },
}));
