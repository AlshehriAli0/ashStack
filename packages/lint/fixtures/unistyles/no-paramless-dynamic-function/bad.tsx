import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme, rt) => ({
  wrapper: () => ({
    flex: 1,
    paddingTop: rt.insets.top + theme.sizing.scale(170),
  }),
}));
