# Database

Script da base de dados MySQL.

O ficheiro `bebe_e_siga.sql` cria a base de dados e as tabelas:

- acesso: marcas (`brands`) e utilizadores (`users`);
- eventos: `events`, `event_days` e `expenses`;
- produtos e fornecedores: `suppliers`, `products`, `product_suppliers` e `product_prices` (histórico de preços);
- ementa: `menu_items` e `menu_item_products` (o que sai do stock em cada venda).

O script pode ser importado mais do que uma vez no phpMyAdmin: usa `CREATE TABLE IF NOT EXISTS`, por isso só cria as tabelas que ainda faltam e não apaga dados.

As tabelas das compras, vendas e stock entram nas próximas etapas.
