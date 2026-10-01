import mongoose from 'mongoose';
import { esquemaCoberturaContratada, esquemaSegurado } from './esquemas.js';

const esquema = new mongoose.Schema(
  {
    numero: { type: Number, required: true, unique: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    segurado: { type: esquemaSegurado, required: true },
    coberturas: { type: [esquemaCoberturaContratada], required: true },
    inicioVigencia: { type: String, required: true },
    fimVigencia: { type: String, required: true },
    premioAnualCentavos: { type: Number, required: true },
    status: { type: String, enum: ['aberta', 'efetivada'], default: 'aberta' },
    numeroApolice: { type: String },
    expiraEm: { type: Date },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

esquema.index({ expiraEm: 1 }, { expireAfterSeconds: 0 });

export const Cotacao = mongoose.models.Cotacao ?? mongoose.model('Cotacao', esquema, 'cotacoes');
