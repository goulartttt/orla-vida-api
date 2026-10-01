import { describe, expect, it } from 'vitest';
import { hoje, somarAnos, somarDias } from '../../src/lib/datas.js';
import { Cotacao } from '../../src/models/Cotacao.js';
import { app, dadosDeCotacao, efetivacaoValida, novoUsuarioLogado, request } from './ajuda.js';

describe('cotações e apólices', () => {
  it('exige login', async () => {
    expect((await request(app).get('/cotacoes')).status).toBe(401);
    expect((await request(app).get('/apolices')).status).toBe(401);
  });

  it('lista o catálogo de coberturas sem login', async () => {
    const resposta = await request(app).get('/coberturas');
    expect(resposta.status).toBe(200);
    expect(resposta.body.coberturas.map((c) => c.codigo)).toContain('MORTE');
    expect(resposta.body.regras.parcelasMaximas).toBe(12);
  });

  it('cria cotação com prêmio calculado no servidor e CPF cifrado no banco', async () => {
    const { agente } = await novoUsuarioLogado();
    const dados = dadosDeCotacao();
    const resposta = await agente.post('/cotacoes').send(dados);

    expect(resposta.status).toBe(201);
    const { cotacao } = resposta.body;
    expect(cotacao.status).toBe('aberta');
    expect(cotacao.premioAnualCentavos).toBe(60_000 + 12_000);
    expect(cotacao.fimVigencia).toBe(somarAnos(dados.inicioVigencia, 1));
    expect(cotacao.coberturas[0]).toMatchObject({ codigo: 'MORTE', nome: 'Morte por qualquer causa' });

    const salvo = await Cotacao.findOne({ numero: cotacao.numero }).lean();
    expect(JSON.stringify(salvo)).not.toContain(dados.segurado.cpf);
    expect(salvo.segurado.cpfCifrado.startsWith('v1:')).toBe(true);

    const lista = await agente.get('/cotacoes');
    expect(lista.body.cotacoes[0].segurado.cpf).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
  });

  it('valida CPF, idade e data de início', async () => {
    const { agente } = await novoUsuarioLogado();

    const cpfInvalido = await agente.post('/cotacoes').send(dadosDeCotacao({ segurado: { nome: 'Fulano Teste', cpf: '111.111.111-11', dataNascimento: '1990-01-01' } }));
    expect(cpfInvalido.status).toBe(400);

    const menor = await agente
      .post('/cotacoes')
      .send(dadosDeCotacao({ segurado: { nome: 'Fulano Teste', cpf: '529.982.247-25', dataNascimento: somarDias(hoje(), -365 * 10) } }));
    expect(menor.status).toBe(422);
    expect(menor.body.campos[0].campo).toBe('segurado.dataNascimento');

    const passado = await agente.post('/cotacoes').send(dadosDeCotacao({ inicioVigencia: somarDias(hoje(), -1) }));
    expect(passado.status).toBe(422);
    expect(passado.body.campos[0].campo).toBe('inicioVigencia');
  });

  it('um usuário não enxerga nem altera a cotação de outro', async () => {
    const dono = await novoUsuarioLogado();
    const intruso = await novoUsuarioLogado();
    const { cotacao } = (await dono.agente.post('/cotacoes').send(dadosDeCotacao())).body;

    expect((await intruso.agente.get(`/cotacoes/${cotacao.numero}`)).status).toBe(404);
    expect((await intruso.agente.put(`/cotacoes/${cotacao.numero}`).send(dadosDeCotacao())).status).toBe(404);
    expect((await intruso.agente.delete(`/cotacoes/${cotacao.numero}`)).status).toBe(404);
    expect((await intruso.agente.post(`/cotacoes/${cotacao.numero}/efetivar`).send(efetivacaoValida)).status).toBe(404);
    expect((await intruso.agente.get('/cotacoes')).body.cotacoes).toHaveLength(0);
  });

  it('permite várias cotações por usuário, editar e excluir enquanto aberta', async () => {
    const { agente } = await novoUsuarioLogado();
    const primeira = (await agente.post('/cotacoes').send(dadosDeCotacao())).body.cotacao;
    await agente.post('/cotacoes').send(dadosDeCotacao());
    expect((await agente.get('/cotacoes')).body.cotacoes).toHaveLength(2);

    const detalhe = await agente.get(`/cotacoes/${primeira.numero}`);
    expect(detalhe.body.cotacao.segurado.cpf).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);

    const editada = await agente
      .put(`/cotacoes/${primeira.numero}`)
      .send(dadosDeCotacao({ coberturas: [{ codigo: 'MORTE', capital: 100_000 }] }));
    expect(editada.status).toBe(200);
    expect(editada.body.cotacao.premioAnualCentavos).toBe(30_000);

    expect((await agente.delete(`/cotacoes/${primeira.numero}`)).status).toBe(204);
    expect((await agente.get('/cotacoes')).body.cotacoes).toHaveLength(1);
  });

  it('efetiva: gera apólice, bloqueia edição e mostra tudo na lista de apólices', async () => {
    const { agente } = await novoUsuarioLogado();
    const { cotacao } = (await agente.post('/cotacoes').send(dadosDeCotacao({ inicioVigencia: hoje() }))).body;

    const somaErrada = await agente.post(`/cotacoes/${cotacao.numero}/efetivar`).send({
      ...efetivacaoValida,
      beneficiarios: [{ nome: 'Só Uma Pessoa', parentesco: 'outro', percentual: 50 }],
    });
    expect(somaErrada.status).toBe(400);

    const resposta = await agente.post(`/cotacoes/${cotacao.numero}/efetivar`).send(efetivacaoValida);
    expect(resposta.status).toBe(201);
    const { apolice } = resposta.body;
    expect(apolice.numero).toMatch(/^ORL-\d{4}-\d{2}-\d{6}$/);
    expect(apolice.situacao).toBe('vigente');
    expect(apolice.pagamento).toMatchObject({ forma: 'parcelado', parcelas: 4, totalCentavos: 72_000, valorParcelaCentavos: 18_000 });
    expect(apolice.beneficiarios).toHaveLength(2);
    expect(apolice.segurado.cpf).toMatch(/^\*\*\*/);

    const depois = (await agente.get(`/cotacoes/${cotacao.numero}`)).body.cotacao;
    expect(depois).toMatchObject({ status: 'efetivada', numeroApolice: apolice.numero });
    expect(depois.segurado.cpf).toMatch(/^\*\*\*/);

    expect((await agente.put(`/cotacoes/${cotacao.numero}`).send(dadosDeCotacao())).status).toBe(409);
    expect((await agente.delete(`/cotacoes/${cotacao.numero}`)).status).toBe(409);
    expect((await agente.post(`/cotacoes/${cotacao.numero}/efetivar`).send(efetivacaoValida)).status).toBe(409);

    const lista = await agente.get('/apolices');
    expect(lista.body.apolices.map((a) => a.numero)).toEqual([apolice.numero]);
    expect((await agente.get(`/apolices/${apolice.numero}`)).body.apolice.coberturas).toHaveLength(2);
    expect((await agente.get('/apolices/ORL-0000-00-000000')).status).toBe(404);
  });

  it('não emite duas apólices sobrepostas para o mesmo segurado', async () => {
    const { agente } = await novoUsuarioLogado();
    const dados = dadosDeCotacao();
    const a = (await agente.post('/cotacoes').send(dados)).body.cotacao;
    const b = (await agente.post('/cotacoes').send({ ...dados, inicioVigencia: somarDias(hoje(), 10) })).body.cotacao;

    expect((await agente.post(`/cotacoes/${a.numero}/efetivar`).send(efetivacaoValida)).status).toBe(201);
    const conflito = await agente.post(`/cotacoes/${b.numero}/efetivar`).send(efetivacaoValida);
    expect(conflito.status).toBe(409);
    expect(conflito.body.erro).toContain('apólice vigente');
  });

  it('valida o número de parcelas conforme o valor', async () => {
    const { agente } = await novoUsuarioLogado();
    const { cotacao } = (await agente.post('/cotacoes').send(dadosDeCotacao({ coberturas: [{ codigo: 'MORTE', capital: 10_000 }] }))).body;
    const resposta = await agente
      .post(`/cotacoes/${cotacao.numero}/efetivar`)
      .send({ ...efetivacaoValida, pagamento: { forma: 'parcelado', parcelas: 2 } });
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro).toContain('apenas à vista');
  });
});
