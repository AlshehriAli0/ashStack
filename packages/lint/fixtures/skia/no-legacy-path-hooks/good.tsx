import { Skia } from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";

const basePath = Skia.Path.Make();

export function useGoodPath(width: SharedValue<number>) {
  return useDerivedValue(() => {
    basePath.reset();
    basePath.addRect({ x: 0, y: 0, width: width.get(), height: 8 });
    return basePath;
  });
}
