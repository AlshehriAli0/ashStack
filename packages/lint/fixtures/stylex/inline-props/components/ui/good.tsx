import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ card: { padding: 8 } });

export const Card = ({ className }: { className?: string }) => {
  const cardStyles = stylex.props(styles.card);
  return <div className={mergeClassName(cardStyles.className, className)} />;
};
