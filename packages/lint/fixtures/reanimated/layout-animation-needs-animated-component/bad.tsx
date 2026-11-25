import { View } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";

export const Toast = ({ children }: { children: React.ReactNode }) => (
  <View entering={FadeIn} exiting={FadeOut}>
    {children}
  </View>
);
