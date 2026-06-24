async function getIncomeReport(fechaDesde, fechaHasta) {
  return await apiFetch(`/reports/daily-sales?desde=${fechaDesde}&hasta=${fechaHasta}`);
}

async function getExpenseReport(fechaDesde, fechaHasta) {
  return [];
}

async function getIncomeVsExpense(fechaDesde, fechaHasta) {
  return await apiFetch(`/reports/income-expense?desde=${fechaDesde}&hasta=${fechaHasta}`);
}

async function getTopProducts(limit = 10) {
  return await apiFetch(`/reports/top-products?limit=${limit}`);
}

async function getDailySalesByPeriod(fechaDesde, fechaHasta) {
  return await apiFetch(`/reports/daily-sales?desde=${fechaDesde}&hasta=${fechaHasta}`);
}

async function getSalesByCategory(fechaDesde, fechaHasta) {
  return await apiFetch(`/reports/sales-by-category?desde=${fechaDesde}&hasta=${fechaHasta}`);
}

async function getSellerSummary(fechaDesde, fechaHasta) {
  return await apiFetch(`/reports/seller-summary?desde=${fechaDesde}&hasta=${fechaHasta}`);
}
