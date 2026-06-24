const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  categoria: { type: String, default: '' },
  descripcion: { type: String, default: '' },
  precio_compra: { type: Number, required: true, default: 0 },
  precio_venta: { type: Number, required: true, default: 0 },
  stock_actual: { type: Number, required: true, default: 0 },
  stock_minimo: { type: Number, required: true, default: 5 },
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Producto', productoSchema);
