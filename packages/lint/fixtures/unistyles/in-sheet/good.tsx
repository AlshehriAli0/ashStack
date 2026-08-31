import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme, rt) => ({
  card: {
    position: "absolute",
    borderRadius: theme.radius.md,
    borderCurve: "continuous",
    boxShadow: theme.shadows.card,
    paddingStart: theme.spacing[4],
    width: rt.screen.width,
    flexDirection: rt.rtl ? "row-reverse" : "row",
    paddingBottom: rt.insets.bottom,
  },
}));
