export const PriceChart = ({ points }: { points: number[] }) => {
  "use no memo";
  return <svg aria-label={`${points.length} points`} />;
};
