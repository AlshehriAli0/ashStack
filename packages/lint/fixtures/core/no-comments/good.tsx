import { View } from "react-native";

/** Renders the settings screen's panel. */
export const SettingsPanel = () => {
  // what: Android fires this layout pass twice below API 31.
  const showsFooter = true;

  // what: The upstream contract sends the cursor as a string, never a number.
  return <View>{showsFooter}</View>;
};
