import { Keyboard } from "react-native";

const onKeyboard = () => undefined;

export function subscribeGood() {
  return Keyboard.addListener("keyboardDidShow", onKeyboard);
}
