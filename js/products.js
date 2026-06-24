async function getAllProducts() {
  return await apiFetch('/products');
}

async function getProductById(id) {
  return await apiFetch(`/products/${id}`);
}

async function searchProducts(term) {
  const all = await apiFetch('/products');
  return all.filter(p =>
    (p.nombre || '').toLowerCase().includes(term.toLowerCase()) ||
    (p.categoria || '').toLowerCase().includes(term.toLowerCase())
  );
}

async function createProduct(data) {
  return await apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function updateProduct(id, data) {
  return await apiFetch(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function deleteProduct(id) {
  return await apiFetch(`/products/${id}`, { method: 'DELETE' });
}

async function reactivateProduct(id) {
  return await apiFetch(`/products/${id}/reactivate`, { method: 'PUT' });
}

async function getLowStockProducts() {
  return await apiFetch('/products/low-stock');
}

async function getCategorias() {
  return await apiFetch('/products/categories');
}

async function getStockStatus(product) {
  if (product.stock_actual === 0) return { text: 'Agotado', class: 'danger' };
  if (product.stock_actual <= product.stock_minimo) return { text: 'Bajo', class: 'warning' };
  return { text: 'Normal', class: 'success' };
}
