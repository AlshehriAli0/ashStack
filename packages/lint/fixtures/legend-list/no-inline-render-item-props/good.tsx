import { LegendList } from "@legendapp/list/react-native";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string }; gap?: number; onSelect?: (id: string) => void }) => JSX.Element;
declare const select: (id: string) => void;
const keyOf = (item: { id: string }) => item.id;

export const Good = () => (
  <LegendList
    data={items}
    renderItem={({ item }) => <Row item={item} gap={8} onSelect={select} />}
    keyExtractor={keyOf}
    recycleItems
  />
);
