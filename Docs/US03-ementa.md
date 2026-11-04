# User Story 03 — Ementa e composição dos artigos

**Como** Gestor ou Administrador,
**quero** preparar a ementa de cada evento, com o preço e a dose de cada artigo,
**para** que as vendas calculem a faturação e descontem o stock certo.

Requisitos: RF08 (Gestão de ementa), RF09 (Composição dos artigos), RF10 (Reutilização de ementa) e RF29 (Consultar ementa).
Casos de uso: UC08, UC09, UC10 e UC29.
Página: `ementa.html`.

## Campos do artigo

| Campo | Obrigatório | Notas |
| --- | --- | --- |
| Nome | Sim | Único dentro da ementa do evento |
| Categoria | Sim | Bebidas, cocktails, comida, shots ou outros |
| Preço | Sim | Preço de venda neste evento |
| Tipo | Sim | Venda direta (1 produto) ou composto (receita com vários produtos) |
| Dose | Sim, se o evento controla o stock | Quanto sai do stock por venda. Ex.: fino = 220 ml descontados |

## Regras

- Cada evento tem a sua ementa. Pode copiar-se a ementa de outro evento e depois ajustar.
- Um artigo de venda direta usa exatamente 1 produto; um composto usa pelo menos 1.
- Os produtos residuais podem estar na receita, mas não são descontados nas vendas.
- Num evento "só com valores" (sem controlo de stock), o artigo pode não ter produtos.
- Um artigo que já tem vendas não pode ser retirado (pode mudar-se o nome ou o preço; as vendas antigas guardam o preço antigo).
- Todos os perfis consultam a ementa; só o Gestor e o Administrador a alteram.

## Critérios de aceitação

1. Não é possível criar dois artigos com o mesmo nome na mesma ementa.
2. Um artigo de venda direta com 0 ou 2 produtos é recusado (num evento com stock).
3. Copiar a ementa de outro evento traz os artigos, preços e receitas.
4. Mudar o preço de um artigo não altera as vendas já registadas.
5. O Colaborador vê a ementa mas não tem os botões de editar, e a API recusa-lhe alterações.
