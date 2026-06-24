async function checkLowStockAlerts() {
  return await getLowStockProducts();
}

async function getAlertCount() {
  const products = await getLowStockProducts();
  return products.length;
}
