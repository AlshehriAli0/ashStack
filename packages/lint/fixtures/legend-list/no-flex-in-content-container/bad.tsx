import { LegendList } from "@legendapp/list/react-native";
import { StyleSheet } from "react-native-unistyles";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string } }) => JSX.Element;
const keyOf = (item: { id: string }) => item.id;
const renderRow = ({ item }: { item: { id: string } }) => <Row item={item} />;

export const Bad = () => (
  <LegendList
    data={items}
    renderItem={renderRow}
    keyExtractor={keyOf}
    recycleItems
    contentContainerStyle={styles.stretched}
  />
);

const styles = StyleSheet.create({
  stretched: { flex: 1 },
});
