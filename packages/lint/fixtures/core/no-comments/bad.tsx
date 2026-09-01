import { View } from "react-native";

// this panel is the one the settings screen renders
export const Panel = () => {
  /** the flag that decides whether the footer shows */
  const flag = true;
  // what: short
  // what: iOS 17 reports the wrong inset for the first layout pass here.
  // what: Android fires this layout pass twice below API 31 on Samsung devices.
  // what: The upstream contract sends the cursor as a string, never a number.
  return <View>{flag}</View>;
};
