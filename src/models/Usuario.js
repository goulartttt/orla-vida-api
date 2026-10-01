import mongoose from 'mongoose';

const esquema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    senhaHash: { type: String, required: true, select: false },
    demo: { type: Boolean, default: false },
    // Contas demo têm prazo de validade; o próprio MongoDB apaga quando vence (índice TTL).
    expiraEm: { type: Date },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

esquema.index({ expiraEm: 1 }, { expireAfterSeconds: 0 });

esquema.methods.publico = function publico() {
  return { id: String(this._id), nome: this.nome, email: this.email, demo: this.demo };
};

export const Usuario = mongoose.models.Usuario ?? mongoose.model('Usuario', esquema);
