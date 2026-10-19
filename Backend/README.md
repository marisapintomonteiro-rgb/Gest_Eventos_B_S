# Backend

Servidor da aplicação, em Node.js com Express. Começa na Sprint 2.

Vai tratar de:

- registo de marca e login, com palavras-passe guardadas com bcrypt;
- validação das permissões de cada perfil (RBAC) em cada pedido;
- ligação à base de dados MySQL (ver `Database/bebe_e_siga.sql`).

O código segue o padrão MVC: `routes` (endereços da API), `controllers` (validam e respondem aos pedidos), `models` (SQL) e `middleware` (sessão e permissões). A explicação completa está na secção 5.1 do `CLAUDE.md`.

As credenciais ficam num ficheiro `.env`, que não vai para o GitHub.
