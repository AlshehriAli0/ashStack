import { observable } from "@legendapp/state";
import { View } from "react-native";

const count$ = observable(0);

export const Counter = () => <View accessibilityValue={{ now: count$.get() }} />;
