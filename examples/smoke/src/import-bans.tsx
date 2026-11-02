import { KeyboardAvoidingView } from "react-native";
// keyboard and skia are forced on in the config, so their module-level import
// bans apply even though neither package is installed here.
import { usePathValue } from "react-native-skia";

export const Form = () => {
  usePathValue(path => path);
  return <KeyboardAvoidingView />;
};
