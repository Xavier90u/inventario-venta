const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, required: true, unique: true },
  contrasena: { type: String, required: true },
  rol: { type: String, enum: ['admin', 'empleado'], default: 'empleado' },
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
