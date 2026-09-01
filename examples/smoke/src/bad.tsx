import { z } from "zod";

enum Kind {
  A,
  B,
}

export const kindSchema = z.nativeEnum(Kind);

export const floating = () => {
  Promise.resolve(1);
};

export const Bad = ({ items }: { items: string[] }) => {
  var total = 0;
  if (total == 1) {
    total = 2;
  }
  return (
    <ul>
      {items.map(item => (
        <li>{item}</li>
      ))}
    </ul>
  );
};
