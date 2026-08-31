import { TurboImage } from "react-native-turbo-image";

export function BadTurboCache({ uri }: { uri: string }) {
  return <TurboImage source={{ uri }} resize={40} />;
}
