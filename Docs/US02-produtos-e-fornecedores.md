# User Story 02 — Produtos e fornecedores

**Como** Gestor ou Administrador,
**quero** registar os produtos que compro e os fornecedores a quem os compro,
**para** poder fazer a ementa, registar compras e comparar preços.

Requisitos: RF07 (Gestão de produtos) e RF11 (Gestão de fornecedores).
Casos de uso: UC07 (Gerir produtos) e UC11 (Gerir fornecedores).
Página: `produtos.html`.

## Campos do produto

| Campo | Obrigatório | Notas |
| --- | --- | --- |
| Nome | Sim | Até 100 caracteres |
| Unidade | Sim | Mililitro, grama ou unidade. Pode escrever-se em L ou kg: o sistema converte (1 L = 1000 ml, 1 kg = 1000 g) |
| Tamanho da embalagem | Sim | Ex.: barril de 30 L = 30000 ml |
| Stock mínimo | Não | Para o alerta de stock baixo |
| Residual | Não | Sal, açúcar, hortelã: entra nos custos mas não é descontado em cada venda |
| Perecível | Não | |
| Fornecedores | Não | Um principal e vários alternativos, cada um com o preço por embalagem |

## Campos do fornecedor

| Campo | Obrigatório | Notas |
| --- | --- | --- |
| Nome | Sim | Até 100 caracteres |
| Contacto | Sim | Telefone português com 9 algarismos (pode ter +351) |
| Email, NIF, morada | Não | O NIF tem 9 algarismos |
| Aceita devoluções | Não | Só os fornecedores que aceitam aparecem nas devoluções |

## Regras

- Só o Gestor e o Administrador veem e alteram produtos e fornecedores. O Colaborador não vê preços.
- Os produtos e fornecedores são da marca e servem para todos os eventos.
- Cada mudança de preço fica no histórico de preços; os preços antigos não se perdem.

## Critérios de aceitação

1. Não é possível guardar um produto sem nome, sem unidade ou sem tamanho de embalagem.
2. Um produto escrito em litros fica guardado em mililitros (e em gramas se for em kg).
3. Um produto só pode ter um fornecedor principal, e cada fornecedor aparece uma vez.
4. Um telefone com algarismos a menos é recusado.
5. O histórico mostra todos os preços de um produto, com a data e o fornecedor.
6. Um Colaborador que chame a API dos produtos recebe "sem permissão" (403).
