// Display formats from DESIGN_SYSTEM §10: `9 Oct 2026`, `12,400`, `$1.84`.

const number = new Intl.NumberFormat("en-GB");
const date = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const usd = new Intl.NumberFormat("en-GB", { style: "currency", currency: "USD" });

export const formatNumber = (value: number) => number.format(value);
export const formatDate = (value: string | Date) => date.format(new Date(value));
export const formatUsd = (value: number) => usd.format(value);
