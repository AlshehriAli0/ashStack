import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export const Toast = ({ children }: { children: React.ReactNode }) => (
  <Animated.View entering={FadeIn} exiting={FadeOut}>
    {children}
  </Animated.View>
);
