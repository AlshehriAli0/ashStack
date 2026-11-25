import { useValue } from "@legendapp/state/react";
import { Text } from "react-native";

import { selectedIds$ } from "@/stores/selection";

export const SelectedMark = ({ id }: { id: string }) => {
  const selected = useValue(() => selectedIds$.has(id));
  return <Text>{selected ? "Selected" : ""}</Text>;
};
