# Database

Script da base de dados MySQL.

O ficheiro `bebe_e_siga.sql` cria a base de dados e as tabelas:

- acesso: marcas (`brands`) e utilizadores (`users`);
- eventos: `events`, `event_days` e `expenses`;
- produtos e fornecedores: `suppliers`, `products`, `product_suppliers` e `product_prices` (histórico de preços);
- ementa: `menu_items` e `menu_item_products` (o que sai do stock em cada venda);
- compras: `purchases` e `purchase_lines` (o stock de cada evento começa com as suas compras);
- operação: `day_closings` (dias fechados), `sales` (vendas) e `stock_movements` (tudo o que muda o stock, menos as compras).

O stock de um produto num evento é: soma das compras + soma dos movimentos (as saídas são negativas).

O script pode ser importado mais do que uma vez no phpMyAdmin: usa `CREATE TABLE IF NOT EXISTS`, por isso só cria as tabelas que ainda faltam e não apaga dados.
