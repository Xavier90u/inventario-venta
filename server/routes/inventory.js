const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Movimiento = require('../models/Movimiento');
const Producto = require('../models/Producto');

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

    const movimientos = await Movimiento.find(filter)
      .populate('producto_id', 'nombre')
      .populate('usuario_id', 'nombre')
      .sort('-fecha');

    res.json(movimientos.map(m => ({
      _id: m._id,
      producto_nombre: m.producto_id?.nombre,
      usuario_nombre: m.usuario_id?.nombre,
      tipo: m.tipo,
      cantidad: m.cantidad,
      motivo: m.motivo,
      fecha: m.fecha
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { producto_id, tipo, cantidad, motivo } = req.body;
    const producto = await Producto.findById(producto_id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    if (tipo === 'salida' && producto.stock_actual < cantidad) {
      return res.status(400).json({ error: `Stock insuficiente. Disponible: ${producto.stock_actual}` });
    }

    if (tipo === 'salida') {
      producto.stock_actual -= cantidad;
    } else {
      producto.stock_actual += cantidad;
    }
    await producto.save();

    const movimiento = await Movimiento.create({
      producto_id, tipo, cantidad, motivo,
      usuario_id: req.user.id, fecha: new Date()
    });

    res.json(movimiento);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
