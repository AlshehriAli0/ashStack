import { runOnUISync } from "react-native-worklets";

declare function measureLayout(): { width: number };

export function onPress() {
  const layout = runOnUISync(measureLayout);
  return layout.width;
}
