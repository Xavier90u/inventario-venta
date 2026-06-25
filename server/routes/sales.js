const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Venta = require('../models/Venta');
const DetalleVenta = require('../models/DetalleVenta');
const Producto = require('../models/Producto');
const Movimiento = require('../models/Movimiento');

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }
}

router.get('/', auth, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const filter = {};
    if (desde) filter.fecha = { $gte: new Date(desde) };
    if (hasta) filter.fecha = { ...filter.fecha, $lte: new Date(hasta + 'T23:59:59') };

    const ventas = await Venta.find(filter)
      .populate('usuario_id', 'nombre')
      .sort('-fecha');

    res.json(ventas.map(v => ({
      _id: v._id,
      cliente: v.cliente,
      subtotal: v.subtotal,
      descuento: v.descuento,
      total: v.total,
      fecha: v.fecha,
      usuario_nombre: v.usuario_id?.nombre
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('usuario_id', 'nombre');
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

    const detalles = await DetalleVenta.find({ venta_id: req.params.id })
      .populate('producto_id', 'nombre');

    res.json({
      _id: venta._id,
      cliente: venta.cliente,
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      total: venta.total,
      fecha: venta.fecha,
      usuario_nombre: venta.usuario_id?.nombre,
      items: detalles.map(d => ({
        _id: d._id,
        producto_nombre: d.producto_id?.nombre,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal
      }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await Venta.aggregate([
      { $match: { fecha: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total_ventas: { $sum: 1 }, total_ingresos: { $sum: '$total' } } }
    ]);
    res.json(result[0] || { total_ventas: 0, total_ingresos: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary/month', auth, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const result = await Venta.aggregate([
      { $match: { fecha: { $gte: monthStart } } },
      { $group: { _id: null, total_ventas: { $sum: 1 }, total_ingresos: { $sum: '$total' } } }
    ]);
    res.json(result[0] || { total_ventas: 0, total_ingresos: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { cliente, items } = req.body;
    let subtotal = 0;

    for (const item of items) {
      const producto = await Producto.findById(item.producto_id);
      if (!producto) return res.status(404).json({ error: `Producto ${item.producto_id} no encontrado` });
      if (producto.stock_actual < item.cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para "${producto.nombre}"` });
      }
      subtotal += producto.precio_venta * item.cantidad;
    }

    const total = subtotal;
    const venta = await Venta.create({
      cliente: cliente || 'Cliente general',
      subtotal, descuento: 0, total,
      usuario_id: req.user.id, fecha: new Date()
    });

    for (const item of items) {
      const producto = await Producto.findById(item.producto_id);
      const itemSubtotal = producto.precio_venta * item.cantidad;

      await DetalleVenta.create({
        venta_id: venta._id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: producto.precio_venta,
        subtotal: itemSubtotal
      });

      producto.stock_actual -= item.cantidad;
      await producto.save();

      await Movimiento.create({
        producto_id: item.producto_id,
        tipo: 'salida',
        cantidad: item.cantidad,
        motivo: `Venta #${venta._id}`,
        usuario_id: req.user.id,
        fecha: new Date()
      });
    }

    res.json({
      id: venta._id,
      cliente: venta.cliente,
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      total: venta.total,
      fecha: venta.fecha,
      usuario_nombre: (await require('../models/Usuario').findById(req.user.id))?.nombre || ''
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
