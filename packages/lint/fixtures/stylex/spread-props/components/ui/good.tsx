import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";

const styles = stylex.create({ card: { padding: 8 } });

type Props = { sx?: StyleXStyles };

export const Card = ({ sx, className }: Props & { className?: string }) => {
  const cardStyles = stylex.props(styles.card, sx);
  return <Widget className={mergeClassName(cardStyles.className, className)} />;
};
