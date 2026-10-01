import { Router } from 'express';
import { COBERTURAS } from '../dominio/coberturas.js';
import { REGRAS } from '../dominio/regras.js';

export const rotasPublicas = Router();

rotasPublicas.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/** Catálogo de coberturas e regras de cálculo, usados pelo front para montar a prévia. */
rotasPublicas.get('/coberturas', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ coberturas: COBERTURAS, regras: REGRAS });
});
