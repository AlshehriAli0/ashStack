import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  first: { padding: 4, margin: 8 },
  second: { margin: 8, padding: 4 },
});

export const Box = () => <div {...stylex.props(styles.first)} />;
