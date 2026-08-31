import { Text } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export function GoodKeyboardHost() {
  return (
    <KeyboardAvoidingView>
      <Text>Sign in</Text>
    </KeyboardAvoidingView>
  );
}
