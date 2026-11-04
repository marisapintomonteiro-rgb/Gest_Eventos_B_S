# User Story 07 — Despesas, resultados e painel

**Como** Gestor ou Administrador,
**quero** registar as despesas do evento e ver os resultados num painel,
**para** saber se o evento está a dar lucro e quanto já gastei do orçamento.

Requisitos: RF20 (Gestão de despesas), RF21 (Resultados financeiros) e RF23 (Dashboard).
Casos de uso: UC20, UC21 e UC23.
Página: `painel.html`.

## Regras

- Uma despesa tem descrição, valor, tipo (fixa ou variável) e pode ser do evento todo ou de um dia.
- As compras não são despesas: entram no cálculo uma só vez, como compras.
- Resultado estimado = faturação − compras e faturas + devoluções − despesas.
- O valor do stock que sobra é mostrado à parte do valor consumido.
- O painel destaca a faturação acumulada, o resultado estimado e o stock baixo, com gráficos da faturação por dia e dos artigos mais vendidos.
- O Colaborador vê o painel sem a parte financeira: o servidor não lhe envia esses valores.

## Critérios de aceitação

1. Uma despesa de 300 € baixa o resultado estimado em 300 €.
2. Uma compra não aparece também nas despesas.
3. Com orçamento definido, o painel mostra o que foi gasto e o que ainda está disponível.
4. Com sessão de Colaborador, a resposta da API do painel não traz os valores financeiros.
