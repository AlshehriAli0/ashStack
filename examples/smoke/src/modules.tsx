import { LegendList } from "@legendapp/list/react-native";
import { observable } from "@legendapp/state";
import { useQuery } from "@tanstack/react-query";
// One intentional violation per forced-on module, plus an import ban.
import { FlatList } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

// legend-state/naming: observable without the trailing $
export const settings = observable({ theme: "dark" });

// unistyles/no-hardcoded-color fires; no-margin is overridden off by the consumer
export const styles = StyleSheet.create(() => ({
  box: { backgroundColor: "#ff0000", margin: 8 },
}));

// query/no-inline-keys: inline query key array
export const useThing = () => useQuery({ queryKey: ["thing"], queryFn: async () => 1 });

export const Screen = ({ items }: { items: { id: string }[] }) => {
  // reanimated/no-shared-value-dot-value
  const progress = useSharedValue(0);
  progress.value = 1;

  return (
    <>
      {/* react-native/no-leaked-render */}
      {items.length && <FlatList data={items} renderItem={() => null} />}
      {/* legend-list/no-remount-key */}
      <LegendList key="remount" data={items} renderItem={() => null} recycleItems keyExtractor={i => i.id} />
      {/* i18n/no-bare-text */}
      <title>hello there</title>
    </>
  );
};
