import { observable } from "@legendapp/state";
import { Memo } from "@legendapp/state/react";
import { View } from "react-native";

const count$ = observable(0);

export const Counter = () => (
  <View>
    <Memo>{() => count$.get()}</Memo>
  </View>
);
