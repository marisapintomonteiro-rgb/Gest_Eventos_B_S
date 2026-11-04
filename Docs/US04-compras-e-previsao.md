# User Story 04 — Compras, previsão e devoluções

**Como** Gestor ou Administrador,
**quero** registar as compras de cada evento, ver uma sugestão de quantidades com base na edição anterior e registar devoluções,
**para** não ficar sem produto, não comprar a mais e saber o custo real.

Requisitos: RF12 (Registo de compras), RF13 (Previsão de compras) e RF22 (Devoluções).
Casos de uso: UC12, UC13 e UC22.
Página: `compras.html`.

## Compra

| Campo | Obrigatório | Notas |
| --- | --- | --- |
| Fornecedor | Sim | Da marca |
| Data | Sim | Antes ou durante o evento |
| Linhas | Sim | Produto, número de embalagens e preço por embalagem |

## Regras

- Uma compra aumenta o stock do evento (embalagens × tamanho da embalagem).
- O preço da compra entra automaticamente no histórico de preços do produto.
- A compra guarda o tamanho da embalagem e o preço desse momento.
- Uma compra só pode ser apagada enquanto o evento não tiver vendas; depois disso corrige-se o stock.
- **Previsão:** escolhe-se a edição anterior do mesmo evento (ex.: Festa do Mar 2026 para a de 2027). A sugestão é o consumo dessa edição × (1 + margem). A margem é ajustável, começa em 10% e pode ir de 0% a 200%. Sem edição anterior, as quantidades escrevem-se à mão.
- **Devoluções:** só a fornecedores que aceitam devoluções, só embalagens fechadas (números inteiros) e no máximo as embalagens compradas a esse fornecedor nesse evento. O valor devolvido reduz o custo.
- **Evento só com valores:** em vez de compras por produto registam-se faturas com fornecedor, data e valor total. Contam como compras, não como despesas.

## Critérios de aceitação

1. Depois de uma compra de 2 barris de 30 L, o stock do produto sobe 60000 ml.
2. Não é possível apagar uma compra num evento que já tem vendas.
3. A previsão mostra, para cada produto, o consumo da edição anterior e a quantidade sugerida com a margem.
4. Não é possível devolver mais embalagens do que as compradas, nem meias embalagens.
5. Uma devolução reduz o total das compras no Painel.
