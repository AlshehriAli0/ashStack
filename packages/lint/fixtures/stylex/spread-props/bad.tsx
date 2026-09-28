import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";

export type Props = { sx?: StyleXStyles; labelStyle?: StyleXStyles };

const styles = stylex.create({ box: { padding: 8 } });
export const Wrong = () => <><Widget sx={styles.box} /><Widget appearance={styles.box} /></>;
