import { View } from "react-native";

export const Price = () => {
  const formatter = new Intl.NumberFormat("en-US");
  return <View accessibilityValue={{ text: formatter.format(10) }} />;
};
