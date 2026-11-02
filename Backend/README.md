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
| GET | `/api/suppliers` | Gestor e Administrador (RF11) |
| POST | `/api/suppliers` | Gestor e Administrador (RF11) |
| GET | `/api/products` | Gestor e Administrador (RF07, com fornecedores e preço mais recente) |
| POST | `/api/products` | Gestor e Administrador (RF07) |
| GET | `/api/products/:id/prices` | Gestor e Administrador (histórico de preços) |
| POST | `/api/products/:id/prices` | Gestor e Administrador (novo preço; o anterior fica no histórico) |
| GET | `/api/health` | qualquer pessoa (teste do servidor e da base de dados) |

## Limitações conhecidas

- As sessões ficam na memória do servidor: ao reiniciar o servidor, todos têm de entrar outra vez.
- O logótipo da marca ainda não é guardado no servidor.
