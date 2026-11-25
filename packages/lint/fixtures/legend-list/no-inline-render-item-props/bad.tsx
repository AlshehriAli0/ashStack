import { LegendList } from "@legendapp/list/react-native";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string }; style?: unknown; onPress?: () => void }) => JSX.Element;
declare const select: (id: string) => void;
const keyOf = (item: { id: string }) => item.id;

export const Bad = () => (
  <LegendList
    data={items}
    renderItem={({ item }) => <Row item={item} style={{ paddingVertical: 8 }} onPress={() => select(item.id)} />}
    keyExtractor={keyOf}
    recycleItems
  />
);
