# User Story 10 — Evento só com valores

**Como** Gestor de uma marca que não quer controlar o stock,
**quero** usar a aplicação só para registar faturas de compra, faturação e despesas,
**para** fazer o balanço do evento sem contar produtos.

Decisão da equipa de 3 de novembro. Complementa RF12, RF14, RF20 e RF21.
Páginas: `eventos.html`, `compras.html`, `vendas.html`, `painel.html` e `relatorio.html`.

## Regras

- Ao criar ou editar um evento, desliga-se a opção "Controlar o stock".
- As compras registam-se como faturas: fornecedor, data, valor total e descrição opcional. Contam como compras.
- A faturação regista-se em euros por dia, ou pela ementa com artigos sem receita.
- A página Stock não se aplica; o Painel e o Relatório não mostram valores de stock.
- O balanço (faturação − compras e faturas − despesas) continua no Painel e no Relatório.

## Critérios de aceitação

1. Num evento sem stock, uma fatura de 450 € aparece em "Compras e faturas" no Painel.
2. A faturação do dia em euros soma à faturação do evento e ao calendário.
3. A API de stock recusa movimentos neste evento ("Este evento não controla o stock").
4. Num evento com stock, a faturação em euros é recusada (as vendas fazem-se pela ementa).
