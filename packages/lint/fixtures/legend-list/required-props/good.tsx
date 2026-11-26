import { LegendList } from "@legendapp/list/react-native";
import { View } from "react-native";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string } }) => JSX.Element;
const keyOf = (item: { id: string }) => item.id;
const renderRow = ({ item }: { item: { id: string } }) => <Row item={item} />;

export const Good = () => (
  <LegendList data={items} renderItem={renderRow} keyExtractor={keyOf} recycleItems />
);

// An explicit opt-out is a decision, not a violation.
export const NoRecycle = () => (
  <LegendList data={items} renderItem={renderRow} keyExtractor={keyOf} recycleItems={false} />
);

// A wrapped list with both props set passes, and a wrapped non-list is never checked.
declare const withUnistyles: <T>(component: T) => T;
const CatalogList = withUnistyles(LegendList<{ id: string }>);
const Panel = withUnistyles(View);
export const GoodWrapped = () => (
  <Panel>
    <CatalogList data={items} renderItem={renderRow} keyExtractor={keyOf} recycleItems />
  </Panel>
);
