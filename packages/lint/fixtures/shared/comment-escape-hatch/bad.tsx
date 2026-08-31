/* what: a block comment cannot carry the hatch */
import { View } from "react-native";

// what: tiny
export const first = 1;
// what: this single line runs on well past the hundred and twenty character budget that the rule sets, so it counts as prose rather than a fact
export const second = 2;
// what: the first of two hatches with no blank line between them at all
// what: the second one, which makes the pair a paragraph in disguise
export const Panel = () => <View />;
