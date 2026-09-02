declare const active: boolean;
declare const size: string;

export const Chip = () => <span className={`px-2 ${active ? "bg-black" : "bg-white"}`} />;

export const Card = () => {
  const cardClasses = [size, active && "ring-2"].join(" ");
  return <div className={cardClasses} />;
};
