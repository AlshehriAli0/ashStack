import { LegendList } from "@legendapp/list/react-native";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string } }) => JSX.Element;
declare const Footer: () => JSX.Element;
const keyOf = (item: { id: string }) => item.id;
const renderRow = ({ item }: { item: { id: string } }) => <Row item={item} />;

export const Bad = () => (
  <LegendList data={items} renderItem={renderRow} keyExtractor={keyOf} recycleItems>
    <Footer />
  </LegendList>
);
