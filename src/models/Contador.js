import mongoose from 'mongoose';

const esquema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });

const Contador = mongoose.models.Contador ?? mongoose.model('Contador', esquema);

/** Sequência atômica: duas requisições simultâneas nunca recebem o mesmo número. */
export async function proximoNumero(nome) {
  const contador = await Contador.findOneAndUpdate(
    { _id: nome },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return contador.seq;
}
