// Servidor para desenvolvimento local (`npm run dev`). Na Vercel este arquivo não é usado.
import { config } from './config/env.js';
import { conectarBanco } from './db/conectar.js';
import app from './index.js';

const { PORT } = config();

await conectarBanco();
app.listen(PORT, () => {
  console.log(`API da Orla Vida rodando em http://localhost:${PORT}`);
});
