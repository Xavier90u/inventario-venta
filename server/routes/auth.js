const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    const user = await Usuario.findOne({ usuario, activo: true });
    if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const valid = await bcrypt.compare(contrasena, user.contrasena);
    if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: { id: user._id, nombre: user.nombre, usuario: user.usuario, rol: user.rol }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
