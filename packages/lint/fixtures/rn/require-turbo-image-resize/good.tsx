import { TurboImage } from "react-native-turbo-image";

export function GoodTurboResize({ uri }: { uri: string }) {
  return <TurboImage source={{ uri }} resize={40} cachePolicy="dataCache" />;
}
