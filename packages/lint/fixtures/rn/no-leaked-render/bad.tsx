import { Text, View } from "react-native";

export function BadLeakedRender({ items }: { items: string[] }) {
  return <View>{items.length && <Text>Has items</Text>}</View>;
}
