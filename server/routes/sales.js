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
      metodo_pago: v.metodo_pago,
      fecha: v.fecha,
      usuario_nombre: v.usuario_id?.nombre
    })));
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ error: 'ID invalido' });
    }
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
      metodo_pago: venta.metodo_pago,
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
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
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
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
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
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { cliente, items, metodo_pago } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }
    for (const item of items) {
      if (typeof item.cantidad !== 'number' || !Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        return res.status(400).json({ error: 'Cantidad invalida para uno de los productos' });
      }
      if (typeof item.producto_id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(item.producto_id)) {
        return res.status(400).json({ error: 'ID de producto invalido' });
      }
    }

    let subtotal = 0;
    const itemsData = [];

    for (const item of items) {
      const producto = await Producto.findOneAndUpdate(
        { _id: item.producto_id, stock_actual: { $gte: item.cantidad } },
        { $inc: { stock_actual: -item.cantidad } },
        { new: true }
      );
      if (!producto) {
        return res.status(400).json({ error: 'Stock insuficiente para producto' });
      }
      const itemSubtotal = producto.precio_venta * item.cantidad;
      subtotal += itemSubtotal;
      itemsData.push({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: producto.precio_venta,
        subtotal: itemSubtotal,
        producto_nombre: producto.nombre
      });
    }

    const total = subtotal;
    const venta = await Venta.create({
      cliente: cliente || 'Cliente general',
      subtotal, descuento: 0, total,
      metodo_pago: metodo_pago || 'efectivo',
      usuario_id: req.user.id, fecha: new Date()
    });

    const detallePromises = itemsData.map(item =>
      DetalleVenta.create({
        venta_id: venta._id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal
      })
    );
    await Promise.all(detallePromises);

    const movimientoPromises = itemsData.map(item =>
      Movimiento.create({
        producto_id: item.producto_id,
        tipo: 'salida',
        cantidad: item.cantidad,
        motivo: `Venta #${venta._id}`,
        usuario_id: req.user.id,
        fecha: new Date()
      })
    );
    await Promise.all(movimientoPromises);

    const usuarioDoc = await require('../models/Usuario').findById(req.user.id).select('nombre');
    res.json({
      id: venta._id,
      cliente: venta.cliente,
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      total: venta.total,
      metodo_pago: venta.metodo_pago,
      fecha: venta.fecha,
      usuario_nombre: usuarioDoc?.nombre || ''
    });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

module.exports = router;
