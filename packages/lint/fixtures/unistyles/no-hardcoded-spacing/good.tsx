import { StyleSheet } from "react-native-unistyles";

const CALIBRATED_GUTTER = 14;

export const styles = StyleSheet.create(theme => ({
  card: {
    padding: theme.spacing[2],
    gap: theme.sizing.scale(4),
    paddingEnd: 0,
    paddingHorizontal: CALIBRATED_GUTTER,
    borderRadius: theme.radius.md,
    borderCurve: "continuous",
    fontSize: theme.typography.body.size,
  },
}));
