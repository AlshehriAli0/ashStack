import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ box: { padding: 8 } });

export const Box = () => <div style={stylex.props(styles.box)} />;

const boxProps = stylex.props(styles.box);
export const ClassOnly = () => <div className={boxProps.className} />;
