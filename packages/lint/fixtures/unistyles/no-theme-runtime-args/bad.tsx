import { Image } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export function Avatars() {
  const { rt } = useUnistyles();
  return <Image style={styles.avatars(rt.screen.width)} />;
}

const styles = StyleSheet.create({
  avatars: (width: number) => ({ width: width * 0.8 }),
});
