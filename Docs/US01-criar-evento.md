# User Story 01 — Criar evento

**Como** Gestor ou Administrador,
**quero** criar um evento com os seus dias e horários,
**para** começar a planear esse evento na aplicação.

Requisitos: RF04 (Criar evento) e RF05 (Configurar dias do evento).
Casos de uso: UC04 (Criar evento) e UC05 (Configurar dias do evento).
Processo: diagrama BPMN em `Docs/BPMN/criar-evento.bpmn`.

## Campos

| Campo | Obrigatório | Notas |
| --- | --- | --- |
| Nome | Sim | Exemplo: Festa do Mar 2027 |
| Local | Sim | |
| Dias do evento | Sim | Podem ser consecutivos ou não consecutivos |
| Horários | Não | Podem variar de dia para dia |
| Tipo de espaço | Não | Interior, exterior ou misto |
| Previsão de público | Não | |
| Orçamento disponível | Não | |
| Despesas iniciais | Não | |

## Regras

- Só o Administrador e o Gestor podem criar eventos. A permissão tem de ser validada no backend, e não apenas escondida na interface.
- Cada evento é independente. Os produtos, os fornecedores e o histórico podem ser partilhados entre eventos.
- As vendas ficam associadas ao dia operacional escolhido pelo utilizador, e não apenas à data do sistema. Num evento das 20h00 às 02h00, uma venda à 01h30 pode continuar a pertencer ao dia anterior.

## Critérios de aceitação

1. Não é possível guardar um evento sem nome, sem local ou sem pelo menos um dia.
2. É possível escolher dias não consecutivos.
3. Cada dia pode ter um horário diferente, ou nenhum.
4. Um horário pode terminar depois da meia-noite.
5. Um Colaborador não consegue criar eventos.
6. Depois de guardado, o evento fica disponível para continuar o planeamento.
