import { useEffect, useState } from "react";
export const A = ({ first, last }: { first: string; last: string }) => {
  const [full, setFull] = useState("");
  useEffect(() => {
    setFull(`${first} ${last}`);
  }, [first, last]);
  return <span>{full}</span>;
};
