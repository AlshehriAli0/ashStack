declare const cn: (...values: unknown[]) => string;
declare const active: boolean;
declare const size: string;

export const Chip = () => <span className={cn("px-2", active ? "bg-black" : "bg-white")} />;

export const Card = () => {
  const cardClasses = cn(size, active && "ring-2");
  return <div className={cardClasses} />;
};

export const Static = () => <div className="flex items-center gap-2" />;
