export const priceOf = (rows: number[], tier?: string, coupon?: string) => {
  let total = 0;
  for (const row of rows) {
    if (row > 0) {
      if (tier === "pro" || tier === "team") {
        total += row * 0.8;
      } else {
        total += row;
      }
    }
  }
  return coupon === undefined ? total : total - 5;
};
