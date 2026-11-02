# Backend

Servidor da aplicação, em Node.js com Express. Também entrega as páginas da pasta `Frontend` (`http://localhost:3000/login.html`).

Trata de:

- registo de marca e login, com palavras-passe guardadas com bcrypt;
- validação das permissões de cada perfil (RBAC) em cada pedido;
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
| GET | `/api/users` | Administrador |
| POST | `/api/users` | Administrador |
| DELETE | `/api/users/:id` | Administrador |
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
| GET | `/api/suppliers` | Gestor e Administrador (RF11) |
| POST | `/api/suppliers` | Gestor e Administrador (RF11) |
| PUT | `/api/suppliers/:id` | Gestor e Administrador (editar fornecedor) |
| GET | `/api/products` | Gestor e Administrador (RF07, com fornecedores e preço mais recente) |
| POST | `/api/products` | Gestor e Administrador (RF07) |
| PUT | `/api/products/:id` | Gestor e Administrador (editar produto; os preços mudam só com "Novo preço") |
| GET | `/api/products/:id/prices` | Gestor e Administrador (histórico de preços) |
| POST | `/api/products/:id/prices` | Gestor e Administrador (novo preço; o anterior fica no histórico) |
| GET | `/api/health` | qualquer pessoa (teste do servidor e da base de dados) |

## Limitações conhecidas

- As sessões ficam na memória do servidor: ao reiniciar o servidor, todos têm de entrar outra vez.
- O logótipo da marca ainda não é guardado no servidor.
