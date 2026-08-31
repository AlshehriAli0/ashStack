import { Image } from "react-native";
import { TurboImage } from "react-native-turbo-image";

const logo = require("./logo.png");

export function GoodLocalImage() {
  return <Image source={logo} />;
}

export function GoodNetworkImage({ uri }: { uri: string }) {
  return <TurboImage source={{ uri }} resize={40} cachePolicy="dataCache" />;
}
