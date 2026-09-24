import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "./tokens.stylex";

export const styles = stylex.create({
  card: { color: colors.text, borderRadius: radii.md },
});
