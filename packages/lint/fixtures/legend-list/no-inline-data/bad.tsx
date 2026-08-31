import { LegendList } from "@legendapp/list/react-native";

declare const items: { id: string; hidden: boolean }[];
declare const Row: (props: { item: { id: string } }) => JSX.Element;
const keyOf = (item: { id: string }) => item.id;
const renderRow = ({ item }: { item: { id: string } }) => <Row item={item} />;

export const BadCall = () => (
  <LegendList data={items.filter(item => !item.hidden)} renderItem={renderRow} keyExtractor={keyOf} recycleItems />
);

export const BadFallback = () => (
  <LegendList data={items ?? []} renderItem={renderRow} keyExtractor={keyOf} recycleItems />
);
