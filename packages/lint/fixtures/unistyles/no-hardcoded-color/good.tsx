import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create(theme => ({
  tinted: { color: theme.colors.text, backgroundColor: theme.colors.surface },
  gradient: { experimental_backgroundImage: theme.gradients.header },
}));
