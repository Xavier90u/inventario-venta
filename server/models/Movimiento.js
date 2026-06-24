const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  producto_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  tipo: { type: String, enum: ['entrada', 'salida'], required: true },
  cantidad: { type: Number, required: true },
  motivo: { type: String, default: '' },
  fecha: { type: Date, default: Date.now },
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
});

module.exports = mongoose.model('Movimiento', movimientoSchema);
