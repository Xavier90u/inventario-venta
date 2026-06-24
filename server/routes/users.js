const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

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

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await Usuario.find().select('-contrasena').sort('nombre');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;
    const exists = await Usuario.findOne({ usuario });
    if (exists) return res.status(400).json({ error: 'El usuario ya existe' });

    const hash = await bcrypt.hash(contrasena, 10);
    const user = await Usuario.create({ nombre, usuario, contrasena: hash, rol });
    res.json({ id: user._id, nombre: user.nombre, usuario: user.usuario, rol: user.rol });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/deactivate', auth, adminOnly, async (req, res) => {
  try {
    const user = await Usuario.findById(req.params.id);
    if (user.usuario === 'admin') return res.status(400).json({ error: 'No se puede desactivar al administrador principal' });
    await Usuario.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;
    const update = { nombre, usuario, rol };
    if (contrasena) {
      update.contrasena = await bcrypt.hash(contrasena, 10);
    }
    const existing = await Usuario.findOne({ usuario, _id: { $ne: req.params.id } });
    if (existing) return res.status(400).json({ error: 'El nombre de usuario ya esta en uso' });
    const user = await Usuario.findByIdAndUpdate(req.params.id, update, { new: true }).select('-contrasena');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/seed', async (req, res) => {
  try {
    const count = await Usuario.countDocuments();
    if (count > 0) return res.json({ msg: 'Ya hay usuarios creados' });

    const adminHash = await bcrypt.hash('admin123', 10);
    const empHash = await bcrypt.hash('empleado123', 10);

    await Usuario.create([
      { nombre: 'Administrador', usuario: 'admin', contrasena: adminHash, rol: 'admin' },
      { nombre: 'Carlos Garcia', usuario: 'carlos', contrasena: empHash, rol: 'empleado' },
      { nombre: 'Maria Lopez', usuario: 'maria', contrasena: empHash, rol: 'empleado' }
    ]);

    res.json({ msg: 'Usuarios creados: admin/admin123, carlos/empleado123, maria/empleado123' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
