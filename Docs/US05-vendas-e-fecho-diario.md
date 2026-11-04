# User Story 05 — Vendas, fecho diário e notas do dia

**Como** Colaborador, Gestor ou Administrador,
**quero** registar as vendas no dia operacional certo e fechar o dia no fim,
**para** saber a faturação de cada dia e manter o stock atualizado.

Requisitos: RF14 (Registo de vendas), RF19 (Fecho e reabertura diária), RF24 (Notas) e RF30 (Consultar faturação diária).
Casos de uso: UC14, UC19, UC24 e UC30.
Página: `vendas.html`.

## Regras

- O dia da venda é escolhido pelo utilizador e não pela hora do sistema: uma venda às 01h30 pode pertencer ao dia anterior.
- As vendas registam-se uma a uma (caixa) ou por quantidade total (ex.: 1000 cervejas).
- Cada venda guarda o dia, o artigo, a quantidade, o nome e o preço do momento e quem a registou.
- A venda desconta do stock os produtos da receita, exceto os residuais.
- Se não houver stock suficiente, a venda fica registada e aparece um aviso (falta registar compras ou corrigir).
- O Colaborador só anula as vendas que registou; o Gestor anula qualquer uma.
- Um dia fechado não aceita registos. O Gestor e o Administrador podem reabrir, corrigir e voltar a fechar.
- O fecho mostra a faturação do dia e o artigo mais vendido; o Gestor pode juntar notas (meteorologia, afluência, produtos esgotados...).
- **Evento só com valores:** além das vendas pela ementa, pode registar-se a faturação do dia em euros.

## Critérios de aceitação

1. Uma venda de 3 Mojitos a 6 € soma 18 € à faturação do dia escolhido.
2. Depois da venda, o stock dos ingredientes desce conforme a receita do artigo.
3. Num dia fechado, a API recusa novas vendas ("Este dia está fechado").
4. Um Colaborador não consegue anular a venda de outra pessoa.
5. Reabrir um dia volta a permitir registos.
