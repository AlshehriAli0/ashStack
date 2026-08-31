import { Image } from "react-native";

export function BadNetworkImage({ uri }: { uri: string }) {
  return <Image source={{ uri }} />;
}
