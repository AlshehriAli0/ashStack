import { TurboImage } from "react-native-turbo-image";

export function BadTurboResize({ uri }: { uri: string }) {
  return <TurboImage source={{ uri }} cachePolicy="dataCache" />;
}
