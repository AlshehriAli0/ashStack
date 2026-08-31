import { StyleSheet } from "react-native-unistyles";

const STACK_OVERLAP = 12;

export const styles = StyleSheet.create(theme => ({
  row: { gap: theme.spacing[2], paddingHorizontal: theme.spacing[4] },
  overlapped: { marginStart: -STACK_OVERLAP },
}));
