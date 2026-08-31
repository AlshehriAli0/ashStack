import { Canvas } from "@shopify/react-native-skia";
import { Platform } from "react-native";

export function GoodCanvas() {
  return <Canvas opaque={Platform.OS === "android"} />;
}
