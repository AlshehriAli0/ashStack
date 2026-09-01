import { View } from "react-native";

/** Renders the settings screen's panel. */
export const SettingsPanel = () => {
  // what: Android fires this layout pass twice below API 31.
  const showsFooter = true;
  return <View>{showsFooter}</View>;
};
