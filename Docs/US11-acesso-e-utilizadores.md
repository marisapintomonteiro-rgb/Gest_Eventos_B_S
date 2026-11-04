# User Story 11 — Acesso, utilizadores e palavras-passe

**Como** Administrador da marca,
**quero** registar a marca, criar as contas da equipa com um perfil e repor uma palavra-passe esquecida,
**para** que cada pessoa só veja e faça o que o seu perfil permite.

Requisitos: RF01 (Autenticação), RF02 (Gestão de utilizadores), RF03 (Gestão de permissões) e RF31 (Registar marca).
Casos de uso: UC01, UC02 e UC03.
Páginas: `registo.html`, `login.html`, `utilizadores.html` e `conta.html`.

## Regras

- O registo cria a marca e a conta do primeiro Administrador.
- O login é obrigatório. A sessão termina ao fim de 30 minutos sem atividade.
- As palavras-passe têm pelo menos 8 caracteres e são guardadas com bcrypt (nunca em texto).
- Perfis: Administrador (tudo), Gestor (gestão do evento, sem utilizadores) e Colaborador (vendas, consumo interno e consulta operacional).
- As permissões são validadas no servidor (`requireRole`); a interface só esconde os botões.
- Recuperar a palavra-passe sem email: o Administrador define uma palavra-passe temporária; no login seguinte a pessoa é obrigada a escolher uma nova em "A minha conta".
- O Administrador não pode remover o próprio acesso.

## Critérios de aceitação

1. Com a palavra-passe errada o login é recusado, sem dizer qual dos campos falhou.
2. Um Gestor que chame a API dos utilizadores recebe 403.
3. Depois de uma reposição, a pessoa só consegue usar a aplicação depois de mudar a palavra-passe.
4. Ao fim de 30 minutos sem atividade a sessão termina e a página volta ao login.
