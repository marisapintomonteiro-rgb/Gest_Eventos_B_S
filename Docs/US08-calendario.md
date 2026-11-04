# User Story 08 — Calendário de desempenho

**Como** utilizador da marca,
**quero** ver os dias dos eventos num calendário, com a faturação de cada dia,
**para** perceber rapidamente quais os dias que correram bem.

Requisitos: RF06 (Calendário) e RF32 (Calendário de desempenho e aviso de lucro).
Caso de uso: UC06.
Página: `calendario.html`.

## Regras

- Cada dia de evento aparece no calendário com o nome do evento e o horário.
- Cada dia pode ter um objetivo de faturação, definido nos dias do evento. O dia fica com uma cor: acima do esperado (mais de 110% do objetivo), cumpriu (90% a 110%) ou abaixo (menos de 90%). Sem objetivo ou sem vendas, fica sem cor.
- Aviso de lucro (só Gestor e Administrador): marca o primeiro dia em que a faturação acumulada do evento iguala ou ultrapassa tudo o que foi pago (compras, faturas e despesas).

## Critérios de aceitação

1. Os dias de todos os eventos aparecem no mês certo, incluindo dias não consecutivos.
2. Um dia com objetivo de 1000 € e 1200 € faturados aparece como "acima do esperado".
3. O aviso de lucro aparece no dia certo e o Colaborador não o recebe.
