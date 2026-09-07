import { View } from "react-native";

const formatter = new Intl.NumberFormat("en-US");

export const Price = () => <View accessibilityValue={{ text: formatter.format(10) }} />;
