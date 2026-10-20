# Bebe e Siga — Gestão de Eventos

Projeto desenvolvido no âmbito da unidade curricular de Aplicações Informáticas.

A aplicação tem como objetivo apoiar o planeamento e a gestão de eventos temporários, incluindo ementas, produtos, fornecedores, compras, vendas, stock e análise de resultados.

## Como abrir

A aplicação corre num servidor Node.js e guarda os dados em MySQL.

1. Ligar o MySQL (por exemplo, pelo WampServer, com o ícone verde) e importar `Database/bebe_e_siga.sql` no phpMyAdmin, escolhendo o servidor MySQL.
2. Na pasta `Backend`, copiar `.env.example` para `.env` e preencher os dados do MySQL e o `SESSION_SECRET`.
3. Na pasta `Backend`, correr `npm install` (só na primeira vez) e depois `npm start`.
4. Abrir `http://localhost:3000/login.html` no Chrome ou no Edge. Na primeira vez é preciso registar a marca.

Não abrir as páginas com duplo clique: têm de ser abertas através do servidor, para a sessão funcionar.

## Tecnologias previstas

- HTML
- CSS
- JavaScript
- Node.js com Express
- MySQL

## Pastas

- `Frontend`: páginas da aplicação
- `Backend`: servidor Node.js com Express (padrão MVC)
- `Database`: script da base de dados
- `Docs`: requisitos, user stories e diagramas

## Regras de programação

Para a criação deste site vamos utilizar o vibe coding, uma forma de criar software usando linguagem natural para instruir uma inteligência artificial a gerar o código por nós. Vamos utilizar o Codex, um agente apoiado por vários LLM, e também o Claude. O contexto do projeto e as regras de código estão no ficheiro `CLAUDE.md`.

