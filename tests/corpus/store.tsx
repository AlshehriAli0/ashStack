import { useEffect, useState } from "react";
declare const store: { get: () => number; subscribe: (fn: () => void) => () => void };
export const F = () => {
  const [v, setV] = useState(store.get());
  useEffect(() => store.subscribe(() => setV(store.get())), []);
  return <span>{v}</span>;
};
