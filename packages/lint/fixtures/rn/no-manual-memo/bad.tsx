import { useMemo } from "react";

export function useBadTotal(items: number[]) {
  return useMemo(() => items.reduce((sum, item) => sum + item, 0), [items]);
}
