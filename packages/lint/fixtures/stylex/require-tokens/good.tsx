import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "./tokens.stylex";

export const styles = stylex.create({
  card: { color: `color-mix(in oklab, ${colors.text} 10%, transparent)`, borderRadius: radii.md },
});
