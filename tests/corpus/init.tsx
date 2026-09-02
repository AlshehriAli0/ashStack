import { useEffect, useState } from "react";
export const C = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return <span>{String(ready)}</span>;
};
