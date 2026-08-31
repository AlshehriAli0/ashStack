import { Text, View } from "react-native";

export function GoodLeakedRender({ items }: { items: string[] }) {
  return <View>{items.length > 0 && <Text>Has items</Text>}</View>;
}
