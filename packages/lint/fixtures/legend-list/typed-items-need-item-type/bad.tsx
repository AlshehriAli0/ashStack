import { LegendList } from "@legendapp/list/react-native";

declare const items: { id: string; type: "header" | "photo" }[];
declare const Header: () => JSX.Element;
declare const Photo: () => JSX.Element;
const keyOf = (item: { id: string }) => item.id;
const renderMixed = ({ item }: { item: { type: string } }) =>
  item.type === "header" ? <Header /> : <Photo />;

export const Bad = () => (
  <LegendList data={items} renderItem={renderMixed} keyExtractor={keyOf} recycleItems />
);
