export const label = (value?: number, displayed?: number, revealed?: boolean) => {
  const hasValue = value !== undefined;
  const changed = displayed !== value;
  const readable = revealed === true || displayed === undefined;
  if (hasValue && changed && readable) return "show";
  return "hide";
};

export const pick = (a: boolean, b: boolean, count: number) => {
  if (a && b && count > 0) return count;
  while (a || b) return 0;
  return -1;
};
