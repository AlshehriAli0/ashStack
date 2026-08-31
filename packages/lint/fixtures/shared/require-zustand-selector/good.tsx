import { View } from "react-native";

import { useSettingsStore } from "@/stores/settings-store";

export const Panel = () => {
  const ready = useSettingsStore(state => state.ready);
  return <View accessible={ready} />;
};
