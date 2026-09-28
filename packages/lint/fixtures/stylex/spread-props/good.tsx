import * as stylex from "@stylexjs/stylex";
import { Widget } from "ui-kit";

const styles = stylex.create({ box: { padding: 8 } });
export const Good = () => <><Widget {...stylex.props(styles.box)} /><div {...stylex.props(styles.box)} /></>;
