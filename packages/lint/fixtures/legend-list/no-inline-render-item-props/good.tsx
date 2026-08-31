import { LegendList } from "@legendapp/list/react-native";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string }; gap?: number }) => JSX.Element;
const keyOf = (item: { id: string }) => item.id;

export const Good = () => (
  <LegendList
    data={items}
    renderItem={({ item }) => <Row item={item} gap={8} />}
    keyExtractor={keyOf}
    recycleItems
  />
);
