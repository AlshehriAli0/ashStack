import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ box: { padding: 8 } });

export const Box = () => <div {...stylex.props(styles.box)} />;
