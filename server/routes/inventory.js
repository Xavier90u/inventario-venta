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
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { producto_id, tipo, cantidad, motivo } = req.body;
    if (!producto_id || !/^[0-9a-fA-F]{24}$/.test(producto_id)) {
      return res.status(400).json({ error: 'ID de producto invalido' });
    }
    if (!['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser entrada o salida' });
    }
    if (typeof cantidad !== 'number' || !Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ error: 'Cantidad debe ser un entero positivo' });
    }

    if (tipo === 'salida') {
      const updated = await Producto.findOneAndUpdate(
        { _id: producto_id, stock_actual: { $gte: cantidad } },
        { $inc: { stock_actual: -cantidad } },
        { new: true }
      );
      if (!updated) {
        return res.status(400).json({ error: 'Stock insuficiente' });
      }
    } else {
      await Producto.findByIdAndUpdate(producto_id, { $inc: { stock_actual: cantidad } });
    }

    const movimiento = await Movimiento.create({
      producto_id, tipo, cantidad, motivo,
      usuario_id: req.user.id, fecha: new Date()
    });

    res.json(movimiento);
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

module.exports = router;
