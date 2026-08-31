import { useObservable } from "@legendapp/state/react";
import { View } from "react-native";

export const Counter = () => {
  const count$ = useObservable(0);
  return <View accessible={count$ !== undefined} />;
};
