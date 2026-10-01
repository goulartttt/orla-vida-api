import mongoose from 'mongoose';
import { PARENTESCOS } from '../dominio/regras.js';
import { esquemaCoberturaContratada, esquemaSegurado } from './esquemas.js';

const esquemaPagamento = new mongoose.Schema(
  {
    forma: { type: String, enum: ['avista', 'parcelado'], required: true },
    parcelas: { type: Number, required: true },
    totalCentavos: { type: Number, required: true },
    valorParcelaCentavos: { type: Number, required: true },
    primeiraParcelaCentavos: { type: Number, required: true },
    descontoCentavos: { type: Number, required: true },
  },
  { _id: false },
);

const esquemaBeneficiario = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true, maxlength: 120 },
    parentesco: { type: String, enum: PARENTESCOS, required: true },
    percentual: { type: Number, required: true },
  },
  { _id: false },
);

// A apólice é uma "foto" da cotação no momento da contratação: não muda depois de emitida.
const esquema = new mongoose.Schema(
  {
    numero: { type: String, required: true, unique: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    numeroCotacao: { type: Number, required: true, unique: true },
    segurado: { type: esquemaSegurado, required: true },
    coberturas: { type: [esquemaCoberturaContratada], required: true },
    inicioVigencia: { type: String, required: true },
    fimVigencia: { type: String, required: true },
    premioAnualCentavos: { type: Number, required: true },
    pagamento: { type: esquemaPagamento, required: true },
    beneficiarios: { type: [esquemaBeneficiario], required: true },
    expiraEm: { type: Date },
  },
  { timestamps: { createdAt: 'emitidaEm', updatedAt: false } },
);

esquema.index({ usuario: 1, 'segurado.cpfHash': 1 });
esquema.index({ expiraEm: 1 }, { expireAfterSeconds: 0 });

export const Apolice = mongoose.models.Apolice ?? mongoose.model('Apolice', esquema, 'apolices');
