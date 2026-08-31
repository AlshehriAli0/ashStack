import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function GoodNesting() {
  return (
    <View style={styles.merged}>
      <Text>One host view instead of two</Text>
    </View>
  );
}

const styles = StyleSheet.create({ merged: {} });
