import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme, rt) => ({
  wrapper: {
    flex: 1,
    paddingTop: rt.insets.top + theme.sizing.scale(170),
  },
  row: (selected: boolean) => ({
    gap: theme.spacing[2],
    backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
  }),
}));
