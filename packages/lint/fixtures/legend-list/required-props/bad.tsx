import { LegendList } from "@legendapp/list/react-native";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string } }) => JSX.Element;
const renderRow = ({ item }: { item: { id: string } }) => <Row item={item} />;

// keyExtractor and recycleItems are both missing.
export const Bad = () => <LegendList data={items} renderItem={renderRow} />;

// A wrapped or renamed list is still a list.
declare const withUnistyles: <T>(component: T) => T;
const CatalogList = withUnistyles(LegendList<{ id: string }>);
export const BadWrapped = () => <CatalogList data={items} renderItem={renderRow} />;
