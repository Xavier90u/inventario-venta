const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Producto = require('../models/Producto');

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Token inválido' }); }
}

function adminOnly(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

router.get('/', auth, async (req, res) => {
  try {
    let filter = { activo: true };
    if (req.query.search) {
      const term = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.nombre = { $regex: term, $options: 'i' };
    }
    const products = await Producto.find(filter).sort('nombre');
    res.json(products);
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const products = await Producto.find().sort('nombre');
    res.json(products);
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.get('/low-stock', auth, async (req, res) => {
  try {
    const products = await Producto.find({ activo: true, $expr: { $lte: ['$stock_actual', '$stock_minimo'] } }).sort('stock_actual');
    res.json(products);
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.get('/categories', auth, async (req, res) => {
  try {
    const cats = await Producto.distinct('categoria', { activo: true, categoria: { $ne: '' } });
    res.json(cats.sort());
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ error: 'ID invalido' });
    }
    const product = await Producto.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'No encontrado' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const allowedFields = ['nombre', 'categoria', 'descripcion', 'precio_compra', 'precio_venta', 'stock_actual', 'stock_minimo'];
    const data = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (typeof data.nombre !== 'string' || data.nombre.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    if (typeof data.precio_compra !== 'number' || data.precio_compra < 0) {
      return res.status(400).json({ error: 'Precio de compra invalido' });
    }
    if (typeof data.precio_venta !== 'number' || data.precio_venta <= 0) {
      return res.status(400).json({ error: 'Precio de venta invalido' });
    }
    const product = await Producto.create(data);
    res.json(product);
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ error: 'ID invalido' });
    }
    const allowedFields = ['nombre', 'categoria', 'descripcion', 'precio_compra', 'precio_venta', 'stock_actual', 'stock_minimo'];
    const data = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.precio_compra !== undefined && (typeof data.precio_compra !== 'number' || data.precio_compra < 0)) {
      return res.status(400).json({ error: 'Precio de compra invalido' });
    }
    if (data.precio_venta !== undefined && (typeof data.precio_venta !== 'number' || data.precio_venta <= 0)) {
      return res.status(400).json({ error: 'Precio de venta invalido' });
    }
    const product = await Producto.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(product);
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ error: 'ID invalido' });
    }
    await Producto.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.put('/:id/reactivate', auth, adminOnly, async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ error: 'ID invalido' });
    }
    await Producto.findByIdAndUpdate(req.params.id, { activo: true });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

module.exports = router;
