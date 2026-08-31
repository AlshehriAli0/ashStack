import { ScrollView } from "react-native";

declare const items: { id: string }[];
declare const Row: (props: { item: { id: string } }) => JSX.Element;

export const Bad = () => (
  <ScrollView>
    {items.map(item => (
      <Row key={item.id} item={item} />
    ))}
  </ScrollView>
);
