# User Story 09 — Encerramento, prazo de edição e relatório final

**Como** Gestor ou Administrador,
**quero** encerrar o evento, escrever as notas finais e gerar o relatório em PDF,
**para** guardar o resultado do evento e usá-lo nas próximas edições.

Requisitos: RF24 (Notas), RF25 (Encerramento do evento), RF26 (Prazo de edição), RF27 (Relatório final) e RF28 (Histórico).
Casos de uso: UC24 a UC28.
Página: `relatorio.html` (e `eventos.html` para o histórico).

## Regras

- O encerramento é manual e só é possível com todos os dias fechados. A contagem final de stock é opcional.
- Depois do encerramento ainda se podem fazer correções e devoluções, dentro do prazo.
- Prazo de edição: até um mês depois do último dia do evento. Depois disso o evento fica só para consulta, sem limite de tempo. O servidor aplica a regra em todas as rotas que alteram um evento.
- O relatório junta faturação por dia, artigos vendidos, compras e faturas, despesas, devoluções, stock e notas, e é guardado em PDF a partir do browser.
- O relatório pode ser gerado de novo depois de correções.

## Critérios de aceitação

1. Com um dia ainda aberto, o botão de encerrar fica desativado e a API recusa o encerramento.
2. Um evento que terminou há mais de um mês não aceita alterações (a API recusa e a página mostra "Só consulta").
3. O PDF mostra só o relatório, sem menus nem botões.
4. A lista de eventos mostra o estado de cada um (a decorrer, encerrado, só consulta).
