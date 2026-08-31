import { useMemo } from "react";

export function useGoodTotal(items: number[]) {
  // why: measured - this sum runs per row in a 10k-item list
  return useMemo(() => items.reduce((sum, item) => sum + item, 0), [items]);
}
