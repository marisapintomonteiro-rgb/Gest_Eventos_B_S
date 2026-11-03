# Database

Script da base de dados MySQL.

O ficheiro `bebe_e_siga.sql` cria a base de dados e as tabelas:

- acesso: marcas (`brands`) e utilizadores (`users`);
- eventos: `events`, `event_days` e `expenses`;
- produtos e fornecedores: `suppliers`, `products`, `product_suppliers` e `product_prices` (histórico de preços);
- ementa: `menu_items` e `menu_item_products` (o que sai do stock em cada venda);
- compras: `purchases` e `purchase_lines` (o stock de cada evento começa com as suas compras);
- operação: `day_closings` (dias fechados), `sales` (vendas) e `stock_movements` (tudo o que muda o stock, menos as compras);
- notas: `event_notes` (notas diárias e finais);
- fim do evento: `purchase_returns` (devoluções a fornecedores) e `event_closings` (eventos encerrados);
- previsão: `event_editions` (liga cada evento à sua edição anterior);
- acesso: `password_resets` (contas com palavra-passe temporária, que têm de a mudar ao entrar);
- modo só com valores: `event_settings` (o evento controla ou não o stock), `purchase_invoices` (faturas pelo valor total) e `day_revenues` (faturação do dia pelo total).

O stock de um produto num evento é: soma das compras + soma dos movimentos (as saídas são negativas).

O script pode ser importado mais do que uma vez no phpMyAdmin: usa `CREATE TABLE IF NOT EXISTS`, por isso só cria as tabelas que ainda faltam e não apaga dados.
