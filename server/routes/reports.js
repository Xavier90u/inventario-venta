const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Venta = require('../models/Venta');
const DetalleVenta = require('../models/DetalleVenta');
const Movimiento = require('../models/Movimiento');
const Producto = require('../models/Producto');

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }
}

function adminOnly(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

router.get('/income-expense', auth, adminOnly, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const filter = {};
    if (desde) filter.fecha = { $gte: new Date(desde) };
    if (hasta) filter.fecha = { ...filter.fecha, $lte: new Date(hasta + 'T23:59:59') };

    const incomeResult = await Venta.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const cogsResult = await DetalleVenta.aggregate([
      { $lookup: { from: 'ventas', localField: 'venta_id', foreignField: '_id', as: 'venta' } },
      { $unwind: '$venta' },
      { $lookup: { from: 'productos', localField: 'producto_id', foreignField: '_id', as: 'producto' } },
      { $unwind: '$producto' },
      ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),
      { $group: { _id: null, total: { $sum: { $multiply: ['$cantidad', '$producto.precio_compra'] } } } }
    ]);

    const ingresos = incomeResult[0]?.total || 0;
    const costoVenta = cogsResult[0]?.total || 0;

    res.json({ ingresos, egresos: costoVenta, ganancia: ingresos - costoVenta });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/monthly-profit', auth, adminOnly, async (req, res) => {
  try {
    const { anio } = req.query;
    const year = anio ? parseInt(anio) : new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const ventas = await Venta.aggregate([
      { $match: { fecha: { $gte: start, $lte: end } } },
      { $group: { _id: { mes: { $month: '$fecha' } }, ingresos: { $sum: '$total' }, num_ventas: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const costos = await DetalleVenta.aggregate([
      { $lookup: { from: 'ventas', localField: 'venta_id', foreignField: '_id', as: 'venta' } },
      { $unwind: '$venta' },
      { $lookup: { from: 'productos', localField: 'producto_id', foreignField: '_id', as: 'producto' } },
      { $unwind: '$producto' },
      { $match: { 'venta.fecha': { $gte: start, $lte: end } } },
      { $group: { _id: { mes: { $month: '$venta.fecha' } }, costo: { $sum: { $multiply: ['$cantidad', '$producto.precio_compra'] } } } },
      { $sort: { _id: 1 } }
    ]);

    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const resultado = meses.map((nombre, i) => {
      const v = ventas.find(x => x._id.mes === i + 1);
      const c = costos.find(x => x._id.mes === i + 1);
      const ingresos = v?.ingresos || 0;
      const costo = c?.costo || 0;
      const ganancia = ingresos - costo;
      return { mes: i + 1, nombre, ingresos, costo, ganancia, num_ventas: v?.num_ventas || 0 };
    });

    res.json({ anio: year, meses: resultado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/top-products', auth, adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await DetalleVenta.aggregate([
      { $lookup: { from: 'productos', localField: 'producto_id', foreignField: '_id', as: 'producto' } },
      { $unwind: '$producto' },
      { $group: { _id: '$producto_id', nombre: { $first: '$producto.nombre' }, total_vendido: { $sum: '$cantidad' }, total_ingreso: { $sum: '$subtotal' } } },
      { $sort: { total_vendido: -1 } },
      { $limit: limit }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/daily-sales', auth, adminOnly, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const filter = {};
    if (desde) filter.fecha = { $gte: new Date(desde) };
    if (hasta) filter.fecha = { ...filter.fecha, $lte: new Date(hasta + 'T23:59:59') };

    const result = await Venta.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } }, num_ventas: { $sum: 1 }, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(result.map(d => ({ dia: d._id, num_ventas: d.num_ventas, total: d.total })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sales-by-category', auth, adminOnly, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const matchFilter = {};
    if (desde) matchFilter['venta.fecha'] = { $gte: new Date(desde) };
    if (hasta) matchFilter['venta.fecha'] = { ...matchFilter['venta.fecha'], $lte: new Date(hasta + 'T23:59:59') };

    const result = await DetalleVenta.aggregate([
      { $lookup: { from: 'ventas', localField: 'venta_id', foreignField: '_id', as: 'venta' } },
      { $unwind: '$venta' },
      { $lookup: { from: 'productos', localField: 'producto_id', foreignField: '_id', as: 'producto' } },
      { $unwind: '$producto' },
      ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
      { $group: { _id: '$producto.categoria', unidades: { $sum: '$cantidad' }, total: { $sum: '$subtotal' } } },
      { $sort: { total: -1 } }
    ]);
    res.json(result.map(c => ({ categoria: c._id || 'Sin categoría', unidades: c.unidades, total: c.total })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/seller-summary', auth, adminOnly, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const filter = {};
    if (desde) filter.fecha = { $gte: new Date(desde) };
    if (hasta) filter.fecha = { ...filter.fecha, $lte: new Date(hasta + 'T23:59:59') };

    const ventas = await Venta.aggregate([
      { $match: filter },
      { $lookup: { from: 'usuarios', localField: 'usuario_id', foreignField: '_id', as: 'vendedor' } },
      { $unwind: '$vendedor' },
      { $group: {
        _id: '$usuario_id',
        vendedor: { $first: '$vendedor.nombre' },
        usuario: { $first: '$vendedor.usuario' },
        num_ventas: { $sum: 1 },
        total_vendido: { $sum: '$total' },
        promedio_venta: { $avg: '$total' }
      }},
      { $sort: { total_vendido: -1 } }
    ]);

    const costos = await DetalleVenta.aggregate([
      { $lookup: { from: 'ventas', localField: 'venta_id', foreignField: '_id', as: 'venta' } },
      { $unwind: '$venta' },
      { $lookup: { from: 'productos', localField: 'producto_id', foreignField: '_id', as: 'producto' } },
      { $unwind: '$producto' },
      ...(Object.keys(filter).length > 0 ? [{ $match: { 'venta.fecha': filter.fecha } }] : []),
      { $group: {
        _id: '$venta.usuario_id',
        costo: { $sum: { $multiply: ['$cantidad', '$producto.precio_compra'] } }
      }}
    ]);

    const result = ventas.map(v => {
      const c = costos.find(x => x._id.toString() === v._id.toString());
      const costo = c?.costo || 0;
      return { ...v, inversion: costo, ganancia: v.total_vendido - costo };
    });

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
