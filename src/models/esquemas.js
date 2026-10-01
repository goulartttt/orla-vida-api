import mongoose from 'mongoose';

// Subdocumentos compartilhados por cotação e apólice.

export const esquemaSegurado = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true, maxlength: 120 },
    dataNascimento: { type: String, required: true },
    // O CPF nunca é salvo em texto puro: só cifrado (AES-256-GCM) e como hash de busca (HMAC).
    cpfCifrado: { type: String, required: true },
    cpfHash: { type: String, required: true },
  },
  { _id: false },
);

export const esquemaCoberturaContratada = new mongoose.Schema(
  {
    codigo: { type: String, required: true },
    capital: { type: Number, required: true },
    premioAnualCentavos: { type: Number, required: true },
  },
  { _id: false },
);
