import { View } from "react-native";

import { formatPrice } from "./helpers";

export const Panel = () => <View accessibilityLabel={formatPrice(1)} />;
