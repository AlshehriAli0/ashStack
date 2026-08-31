import { View } from "react-native";

import { useSettingsStore } from "@/stores/settings-store";

export const Panel = () => {
  const settings = useSettingsStore();
  return <View accessible={settings.ready} />;
};
