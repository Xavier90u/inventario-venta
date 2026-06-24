async function addMovement(productoId, tipo, cantidad, motivo, usuarioId) {
  return await apiFetch('/inventory', {
    method: 'POST',
    body: JSON.stringify({ producto_id: productoId, tipo, cantidad, motivo })
  });
}

async function getMovements(productoId = null, fechaDesde = null, fechaHasta = null) {
  const params = new URLSearchParams();
  if (fechaDesde) params.set('desde', fechaDesde);
  if (fechaHasta) params.set('hasta', fechaHasta);
  const qs = params.toString();
  return await apiFetch(`/inventory${qs ? '?' + qs : ''}`);
}

async function getMovementsSummary(fechaDesde = null, fechaHasta = null) {
  const movements = await getMovements(null, fechaDesde, fechaHasta);
  const summary = {};
  movements.forEach(m => {
    if (!summary[m.tipo]) summary[m.tipo] = 0;
    summary[m.tipo] += m.cantidad;
  });
  return Object.entries(summary).map(([tipo, total_cantidad]) => ({ tipo, total_cantidad }));
}
