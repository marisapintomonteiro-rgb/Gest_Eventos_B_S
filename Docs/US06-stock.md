# User Story 06 — Stock, consumos, perdas e correções

**Como** Gestor ou Administrador (e, para o consumo interno, Colaborador),
**quero** ver o stock de cada produto e registar o que sai sem ser vendido,
**para** saber o que ainda tenho e evitar ficar sem produto.

Requisitos: RF15 (Atualização de stock), RF16 (Consumos e desperdícios), RF17 (Correção de stock) e RF18 (Alertas de stock baixo).
Casos de uso: UC15 a UC18.
Página: `stock.html`.

## Regras

- Stock de um produto num evento = compras + movimentos (vendas, consumos, ofertas, quebras, desperdícios e correções; as saídas são negativas).
- Todos os perfis registam consumo interno; ofertas, quebras e desperdícios são do Gestor e do Administrador.
- Correção manual (contagem física) só pelo Gestor ou Administrador, com motivo. Fica guardada a quantidade anterior, a nova, o motivo e quem corrigiu.
- Quando o stock fica igual ou abaixo do mínimo do produto aparece o alerta de stock baixo (também na página Início e no Painel).
- Num dia fechado não se registam saídas.
- Num evento "só com valores" a página Stock não se aplica.

## Critérios de aceitação

1. Uma correção de 12 L para 10 L regista uma saída de 2 L com o motivo e o utilizador.
2. Um Colaborador não consegue registar uma quebra nem uma correção (403).
3. Um produto com mínimo de 5 L e 4 L em stock aparece como stock baixo.
4. Uma correção para a mesma quantidade é recusada ("não há nada a corrigir").
