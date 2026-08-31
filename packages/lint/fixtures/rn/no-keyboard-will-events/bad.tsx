import { Keyboard } from "react-native";

const onKeyboard = () => undefined;

export function subscribeBad() {
  return Keyboard.addListener("keyboardWillShow", onKeyboard);
}
