// keyboard and skia are forced on in the config, so their module-level import
// bans apply even though neither package is installed here.
import { usePathValue } from "@shopify/react-native-skia";
import { KeyboardAvoidingView } from "react-native";

export const Form = () => {
  usePathValue(path => path);
  return <KeyboardAvoidingView />;
};
