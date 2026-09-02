import { useEffect, useState } from "react";
export const B = () => {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  useEffect(() => {
    setB(a + 1);
  }, [a]);
  return <span>{a + b}</span>;
};
