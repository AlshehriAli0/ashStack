import { useEffect, useState } from "react";
export const D = ({ id }: { id: string }) => {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    setSel(null);
  }, [id]);
  return <span>{sel}</span>;
};
