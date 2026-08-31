import { Text } from "react-native";

export function BadHoist() {
  const formatLabel = (count: number) => `${count} items`;
  return <Text>{formatLabel(3)}</Text>;
}
