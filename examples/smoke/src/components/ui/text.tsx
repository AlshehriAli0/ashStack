// The design-system wrapper itself: allowed to import the raw primitive.
import { Text as RNText } from "react-native";

export const Text = ({ children }: { children: string }) => <RNText>{children}</RNText>;
