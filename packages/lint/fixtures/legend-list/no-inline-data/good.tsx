import { LegendList } from "@legendapp/list/react-native";
import { useMemo } from "react";

declare const rawItems: { id: string; hidden: boolean }[];
declare const Row: (props: { item: { id: string } }) => JSX.Element;
const keyOf = (item: { id: string }) => item.id;
const renderRow = ({ item }: { item: { id: string } }) => <Row item={item} />;

export const Good = () => {
  const visible = useMemo(() => rawItems.filter(item => !item.hidden), []);
  return <LegendList data={visible} renderItem={renderRow} keyExtractor={keyOf} recycleItems />;
};
