import { Skia, usePathValue } from "@shopify/react-native-skia";

const basePath = Skia.Path.Make();

export function useBadPath(width: number) {
  return usePathValue(path => {
    path.reset();
    path.addRect({ x: 0, y: 0, width, height: 8 });
  }, basePath);
}
