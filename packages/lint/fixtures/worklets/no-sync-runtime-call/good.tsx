import { runOnUIAsync } from "react-native-worklets";

declare function measureLayout(): { width: number };

export async function onPress() {
  const layout = await runOnUIAsync(measureLayout);
  return layout.width;
}
