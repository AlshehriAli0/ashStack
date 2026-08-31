import { LegendList } from "@legendapp/list/react-native";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string } }) => JSX.Element;
const renderRow = ({ item }: { item: { id: string } }) => <Row item={item} />;

// keyExtractor and recycleItems are both missing.
export const Bad = () => <LegendList data={items} renderItem={renderRow} />;
