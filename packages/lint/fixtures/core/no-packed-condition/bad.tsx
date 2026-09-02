export const label = (value?: number, displayed?: number, revealed?: boolean) => {
  if (value !== undefined && displayed !== value && (revealed === true || displayed === undefined)) {
    return "show";
  }
  return "hide";
};
