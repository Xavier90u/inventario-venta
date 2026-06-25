const mongoose = require('mongoose');

const detalleVentaSchema = new mongoose.Schema({
  venta_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta', required: true },
  producto_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidad: { type: Number, required: true },
  precio_unitario: { type: Number, required: true },
  subtotal: { type: Number, required: true }
});

detalleVentaSchema.index({ venta_id: 1 });
detalleVentaSchema.index({ producto_id: 1 });

module.exports = mongoose.model('DetalleVenta', detalleVentaSchema);
