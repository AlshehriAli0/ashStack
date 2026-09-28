import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";

export type Props = { style?: StyleXStyles; labelStyle?: StyleXStyles };

const styles = stylex.create({ box: { padding: 8 } });
export const Wrong = () => <Widget appearance={styles.box} />;
