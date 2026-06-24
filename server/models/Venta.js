const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  cliente: { type: String, default: 'Cliente general' },
  subtotal: { type: Number, required: true, default: 0 },
  descuento: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  fecha: { type: Date, default: Date.now },
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
});

module.exports = mongoose.model('Venta', ventaSchema);
