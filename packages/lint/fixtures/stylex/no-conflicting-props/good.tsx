import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ box: { color: "red" } });

export const Box = () => <div {...stylex.props(styles.box)} style={{ left: "10%" }} />;
