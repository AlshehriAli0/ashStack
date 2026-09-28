import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";

export type Props = { sx?: StyleXStyles; labelSx?: StyleXStyles };

const styles = stylex.create({ box: { padding: 8 } });
export const Good = () => <><Widget sx={styles.box} /><div {...stylex.props(styles.box)} /></>;
