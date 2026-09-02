import { useEffect, useState } from "react";
export const E = ({ onChange }: { onChange: (n: number) => void }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    onChange(n);
  }, [n, onChange]);
  return <button type="button" onClick={() => setN(1)} />;
};
