import { useState } from "react";
import { useFrameCallback } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export function BadWorkletState() {
  const [, setVisible] = useState(false);

  useFrameCallback(() => {
    scheduleOnRN(setVisible, true);
  });

  return null;
}
