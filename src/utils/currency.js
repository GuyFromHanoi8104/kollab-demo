// Vietnamese Dong formatting, shared across every budget/pricing display in
// the app. `toLocaleString('vi-VN')` gives the "." thousands-separator
// convention (e.g. 5000000 -> "5.000.000").
export function formatVND(amount) {
  return `₫${amount.toLocaleString("vi-VN")}`;
}
