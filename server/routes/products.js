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
    const products = await Producto.find({ activo: true }).sort('nombre');
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const products = await Producto.find().sort('nombre');
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/low-stock', auth, async (req, res) => {
  try {
    const products = await Producto.find({ activo: true, $expr: { $lte: ['$stock_actual', '$stock_minimo'] } }).sort('stock_actual');
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/categories', auth, async (req, res) => {
  try {
    const cats = await Producto.distinct('categoria', { activo: true, categoria: { $ne: '' } });
    res.json(cats.sort());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Producto.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'No encontrado' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const product = await Producto.create(req.body);
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const product = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Producto.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
