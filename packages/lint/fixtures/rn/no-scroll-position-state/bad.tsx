import { useState } from "react";
import { ScrollView } from "react-native";

export function BadScroll() {
  const [, setOffset] = useState(0);
  return <ScrollView onScroll={event => setOffset(event.nativeEvent.contentOffset.y)} />;
}
