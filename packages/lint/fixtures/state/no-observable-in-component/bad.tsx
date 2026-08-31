import { observable } from "@legendapp/state";
import { View } from "react-native";

export const Counter = () => {
  const count$ = observable(0);
  return <View accessible={count$ !== undefined} />;
};
