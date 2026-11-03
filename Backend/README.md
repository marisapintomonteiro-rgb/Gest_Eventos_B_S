# Backend

Servidor da aplicação, em Node.js com Express. Também entrega as páginas da pasta `Frontend` (`http://localhost:3000/login.html`).

Trata de:

- registo de marca e login, com palavras-passe guardadas com bcrypt;
- validação das permissões de cada perfil (RBAC) em cada pedido;
- eventos, produtos, fornecedores, ementas, compras, vendas, stock, despesas, devoluções, notas, resultados, calendário, previsão de compras e relatório;
- prazo de edição de cada evento (`middleware/eventMiddleware.js`);
- ligação à base de dados MySQL (ver `Database/bebe_e_siga.sql`).

O código segue o padrão MVC: `routes` (endereços da API), `controllers` (validam e respondem aos pedidos), `models` (SQL) e `middleware` (sessão e permissões). A explicação completa está na secção 5.1 do `CLAUDE.md`.

As credenciais e o segredo das sessões ficam num ficheiro `.env`, que não vai para o GitHub. O `.env.example` mostra o que é preciso preencher.

## Endereços da API

| Pedido | Endereço | Quem pode |
| --- | --- | --- |
| POST | `/api/auth/register` | qualquer pessoa (registar marca) |
| POST | `/api/auth/login` | qualquer pessoa (entrar) |
| GET | `/api/auth/me` | quem tem sessão |
| POST | `/api/auth/logout` | quem tem sessão |
| PUT | `/api/auth/password` | quem tem sessão (mudar a própria palavra-passe) |
| GET | `/api/users` | Administrador |
| POST | `/api/users` | Administrador |
| DELETE | `/api/users/:id` | Administrador |
| POST | `/api/users/:id/password` | Administrador (repor a palavra-passe; fica temporária) |
| GET | `/api/events` | quem tem sessão (eventos da sua marca) |
| POST | `/api/events` | Gestor e Administrador (US01) |
| GET | `/api/events/:eventId/menu` | quem tem sessão (RF29; o Colaborador não recebe a composição) |
| POST | `/api/events/:eventId/menu` | Gestor e Administrador (RF08, RF09) |
| PUT | `/api/events/:eventId/menu/:itemId` | Gestor e Administrador |
| DELETE | `/api/events/:eventId/menu/:itemId` | Gestor e Administrador |
| POST | `/api/events/:eventId/menu/copy` | Gestor e Administrador (RF10, copiar de outro evento) |
| GET | `/api/events/:eventId/purchases` | Gestor e Administrador (compras do evento e stock) |
| POST | `/api/events/:eventId/purchases` | Gestor e Administrador (RF12; atualiza o stock e o histórico de preços) |
| DELETE | `/api/events/:eventId/purchases/:purchaseId` | Gestor e Administrador (compra registada por engano) |
| GET | `/api/events/:eventId/days` | quem tem sessão (dias do evento, com a indicação de fechado) |
| POST | `/api/events/:eventId/days/:dayId/close` | Gestor e Administrador (RF19, fechar o dia) |
| POST | `/api/events/:eventId/days/:dayId/reopen` | Gestor e Administrador (reabrir para corrigir) |
| GET | `/api/events/:eventId/notes` | quem tem sessão (RF24) |
| POST | `/api/events/:eventId/notes` | Gestor e Administrador (nota diária ou final) |
| DELETE | `/api/events/:eventId/notes/:noteId` | Gestor e Administrador |
| GET | `/api/events/:eventId/sales?day=ID` | quem tem sessão (vendas e faturação do dia, RF30) |
| POST | `/api/events/:eventId/sales` | quem tem sessão (RF14; desconta o stock pela receita) |
| POST | `/api/events/:eventId/sales/:saleId/cancel` | Colaborador (as suas), Gestor e Administrador (todas) |
| GET | `/api/events/:eventId/stock` | quem tem sessão (stock e movimentos, sem valores em euros) |
| POST | `/api/events/:eventId/stock/movements` | consumo interno: todos; oferta, quebra e desperdício: Gestor (RF16) |
| POST | `/api/events/:eventId/stock/corrections` | Gestor e Administrador (RF17; guarda anterior, nova e motivo) |
| GET | `/api/events/:eventId/expenses` | Gestor e Administrador (RF20) |
| POST | `/api/events/:eventId/expenses` | Gestor e Administrador (do evento ou de um dia) |
| DELETE | `/api/events/:eventId/expenses/:expenseId` | Gestor e Administrador |
| GET | `/api/events/:eventId/dashboard` | quem tem sessão (RF23; os valores financeiros do RF21 só para Gestor e Administrador) |
| GET | `/api/events/:eventId/returns` | Gestor e Administrador (RF22, devoluções e sugestão do que se pode devolver) |
| POST | `/api/events/:eventId/returns` | Gestor e Administrador (embalagens fechadas, fornecedor que aceita) |
| DELETE | `/api/events/:eventId/returns/:returnId` | Gestor e Administrador |
| GET | `/api/events/:eventId/report` | Gestor e Administrador (RF27, dados do relatório final) |
| POST | `/api/events/:eventId/close` | Gestor e Administrador (RF25; todos os dias fechados) |
| GET | `/api/events/:eventId` | Gestor e Administrador (dados para editar o evento) |
| PUT | `/api/events/:eventId` | Gestor e Administrador (alterar o evento e os dias; os dias com registos não se retiram) |
| GET | `/api/events/calendar` | quem tem sessão (RF06, RF32; o aviso de lucro só para Gestor e Administrador) |
| GET | `/api/events/:eventId/forecast?margin=10` | Gestor e Administrador (RF13) |
| PUT | `/api/events/:eventId/previous` | Gestor e Administrador (edição anterior do evento) |
| GET | `/api/events/:eventId/invoices` | Gestor e Administrador (faturas pelo valor total) |
| POST | `/api/events/:eventId/invoices` | Gestor e Administrador (fornecedor, data e valor) |
| DELETE | `/api/events/:eventId/invoices/:invoiceId` | Gestor e Administrador |
| POST | `/api/events/:eventId/sales/totals` | quem tem sessão (faturação do dia em euros, só em eventos sem stock) |
| DELETE | `/api/events/:eventId/sales/totals/:revenueId` | Colaborador (os seus), Gestor e Administrador |
| GET | `/api/suppliers` | Gestor e Administrador (RF11) |
| POST | `/api/suppliers` | Gestor e Administrador (RF11) |
| PUT | `/api/suppliers/:id` | Gestor e Administrador (editar fornecedor) |
| GET | `/api/products` | Gestor e Administrador (RF07, com fornecedores e preço mais recente) |
| POST | `/api/products` | Gestor e Administrador (RF07) |
| PUT | `/api/products/:id` | Gestor e Administrador (editar produto; os preços mudam só com "Novo preço") |
| GET | `/api/products/:id/prices` | Gestor e Administrador (histórico de preços) |
| POST | `/api/products/:id/prices` | Gestor e Administrador (novo preço; o anterior fica no histórico) |
| GET | `/api/health` | qualquer pessoa (teste do servidor e da base de dados) |

## Prazo de edição (RF26)

Todas as rotas que alteram um evento passam pelo `middleware/eventMiddleware.js` (`requireEditableEvent`): um mês depois do último dia, o evento fica só para consulta e o servidor responde com erro 403.

## Limitações conhecidas

- As sessões ficam na memória do servidor: ao reiniciar o servidor, todos têm de entrar outra vez.
- O logótipo da marca e as fotografias dos artigos ainda não são guardados no servidor.
- O PDF do relatório é feito pelo browser ("Guardar como PDF" na janela de impressão).
