import { describe, expect, it } from 'vitest';
import { Usuario } from '../../src/models/Usuario.js';
import { app, novoUsuarioLogado, request } from './ajuda.js';

describe('autenticação', () => {
  it('cadastra, guarda a senha com hash e abre a sessão em cookie httpOnly', async () => {
    const resposta = await request(app)
      .post('/auth/cadastro')
      .send({ nome: 'Ana Teste', email: 'Ana.Teste@Exemplo.test', senha: 'senhaForte1' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.usuario).toMatchObject({ nome: 'Ana Teste', email: 'ana.teste@exemplo.test', demo: false });
    expect(resposta.body.usuario).not.toHaveProperty('senhaHash');

    const cookie = resposta.headers['set-cookie'][0];
    expect(cookie).toMatch(/^orla_sessao=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const salvo = await Usuario.findOne({ email: 'ana.teste@exemplo.test' }).select('+senhaHash');
    expect(salvo.senhaHash).toMatch(/^scrypt\$/);
  });

  it('valida os campos e recusa e-mail repetido', async () => {
    const invalido = await request(app).post('/auth/cadastro').send({ nome: 'A', email: 'x', senha: '123' });
    expect(invalido.status).toBe(400);
    expect(invalido.body.campos.map((c) => c.campo)).toEqual(expect.arrayContaining(['nome', 'email', 'senha']));

    const { email } = await novoUsuarioLogado();
    const repetido = await request(app).post('/auth/cadastro').send({ nome: 'Outra Pessoa', email, senha: 'senhaForte1' });
    expect(repetido.status).toBe(409);
  });

  it('recusa campos extras (proteção contra injeção de operadores)', async () => {
    const resposta = await request(app)
      .post('/auth/login')
      .send({ email: 'a@exemplo.test', senha: { $gt: '' } });
    expect(resposta.status).toBe(400);
  });

  it('faz login, consulta /me e sai', async () => {
    const { email } = await novoUsuarioLogado();
    const agente = request.agent(app);

    const errada = await agente.post('/auth/login').send({ email, senha: 'senhaErrada1' });
    expect(errada.status).toBe(401);
    expect(errada.body.erro).toBe('E-mail ou senha incorretos.');

    const inexistente = await agente.post('/auth/login').send({ email: 'ninguem@exemplo.test', senha: 'senhaForte1' });
    expect(inexistente.body.erro).toBe(errada.body.erro);

    expect((await agente.post('/auth/login').send({ email, senha: 'senhaForte1' })).status).toBe(200);
    expect((await agente.get('/auth/me')).body.usuario.email).toBe(email);

    expect((await agente.post('/auth/logout')).status).toBe(204);
    expect((await agente.get('/auth/me')).status).toBe(401);
  });

  it('rejeita token adulterado', async () => {
    const resposta = await request(app).get('/auth/me').set('Cookie', 'orla_sessao=token.falso.123');
    expect(resposta.status).toBe(401);
  });

  it('cria conta demo com dados de exemplo que expiram', async () => {
    const agente = request.agent(app);
    const resposta = await agente.post('/auth/demo');
    expect(resposta.status).toBe(201);
    expect(resposta.body.usuario.demo).toBe(true);

    const painel = await agente.get('/painel');
    expect(painel.body.resumo).toMatchObject({ cotacoesAbertas: 1, apolicesAtivas: 1 });

    const usuario = await Usuario.findById(resposta.body.usuario.id);
    expect(usuario.expiraEm.getTime()).toBeGreaterThan(Date.now());
  });
});
