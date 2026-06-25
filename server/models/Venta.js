const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  cliente: { type: String, default: 'Cliente general' },
  subtotal: { type: Number, required: true, default: 0 },
  descuento: { type: Number, default: 0 },
  total: { type: Number, required: true, default: 0 },
  metodo_pago: { type: String, enum: ['efectivo', 'yape', 'plin', 'transferencia', 'tarjeta', 'otro'], default: 'efectivo' },
  fecha: { type: Date, default: Date.now },
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
});

ventaSchema.index({ fecha: -1 });
ventaSchema.index({ usuario_id: 1, fecha: -1 });

module.exports = mongoose.model('Venta', ventaSchema);
