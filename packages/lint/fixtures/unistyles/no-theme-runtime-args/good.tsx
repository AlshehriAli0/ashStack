import { Image } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function Avatars({ selected }: { selected: boolean }) {
  return <Image style={styles.avatars(selected)} />;
}

const styles = StyleSheet.create((theme, rt) => ({
  avatars: (selected: boolean) => ({
    width: rt.screen.width * 0.8,
    backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
  }),
}));
