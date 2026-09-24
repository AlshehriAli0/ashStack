import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ box: { padding: 8 } });

export const Box = () => {
  const boxProps = stylex.props(styles.box);
  return <div {...boxProps} />;
};
