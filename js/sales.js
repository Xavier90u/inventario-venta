async function createSale(cliente, items, usuarioId) {
  const data = await apiFetch('/sales', {
    method: 'POST',
    body: JSON.stringify({ cliente, items })
  });
  return { _id: data.id, cliente: data.cliente, total: data.total, fecha: data.fecha, usuario_nombre: data.usuario_nombre };
}

async function getAllSales(fechaDesde = null, fechaHasta = null) {
  const params = new URLSearchParams();
  if (fechaDesde) params.set('desde', fechaDesde);
  if (fechaHasta) params.set('hasta', fechaHasta);
  const qs = params.toString();
  return await apiFetch(`/sales${qs ? '?' + qs : ''}`);
}

async function getSaleById(ventaId) {
  return await apiFetch(`/sales/${ventaId}`);
}

async function getSalesSummary(fechaDesde = null, fechaHasta = null) {
  const params = new URLSearchParams();
  if (fechaDesde) params.set('desde', fechaDesde);
  if (fechaHasta) params.set('hasta', fechaHasta);
  const qs = params.toString();
  const sales = await apiFetch(`/sales${qs ? '?' + qs : ''}`);
  const total_ventas = sales.length;
  const total_ingresos = sales.reduce((sum, s) => sum + s.total, 0);
  return { total_ventas, total_ingresos };
}
