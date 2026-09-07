const rateFor = (tier?: string) => (tier === "pro" || tier === "team" ? 0.8 : 1);

const discounted = (total: number, coupon?: string) => (coupon === undefined ? total : total - 5);

export const priceOf = (rows: number[], tier?: string, coupon?: string) => {
  const charged = rows.filter(row => row > 0);
  const total = charged.reduce((sum, row) => sum + row * rateFor(tier), 0);
  return discounted(total, coupon);
};
