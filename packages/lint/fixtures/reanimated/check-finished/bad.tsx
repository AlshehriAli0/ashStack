import { withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export const dismiss = (translateX: SharedValue<number>, onDismiss: () => void) => {
  translateX.set(withTiming(400, { duration: 200 }, () => scheduleOnRN(onDismiss)));
};
