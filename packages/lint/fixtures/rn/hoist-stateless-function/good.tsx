import { Text } from "react-native";

const formatLabel = (count: number) => `${count} items`;

export function GoodHoist({ count }: { count: number }) {
  const label = () => formatLabel(count);
  return <Text>{label()}</Text>;
}
