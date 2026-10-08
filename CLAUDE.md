# CLAUDE.md — Projeto Bebe e Siga

## 1. Contexto do projeto

Este é um projeto académico da unidade curricular de **Aplicações Informáticas**.

O projeto chama-se **Bebe e Siga** e consiste numa aplicação web para apoiar o **planeamento, acompanhamento e análise de eventos temporários**.

O caso de estudo é real e baseia-se na marca Bebe e Siga, mas a aplicação deve ser pensada de forma suficientemente genérica para poder ser adaptada a outros negócios com necessidades semelhantes.

A aplicação não se destina à gestão diária de um café. O foco são **eventos temporários**.

---

## 2. Forma de desenvolvimento

O projeto será desenvolvido com recurso a **vibe coding**, utilizando ferramentas de IA como apoio ao desenvolvimento.

A IA pode:
- ajudar a escrever código;
- explicar código;
- sugerir melhorias;
- detetar erros;
- propor estruturas técnicas.

No entanto:
- o código deve continuar simples e compreensível;
- as decisões funcionais pertencem à equipa;
- não devem ser inventados requisitos;
- qualquer alteração relevante à arquitetura deve ser explicada antes;
- cada funcionalidade deve ser desenvolvida por etapas pequenas;
- o código deve ser suficientemente claro para poder ser explicado numa apresentação académica.

---

## 3. Objetivos principais

A aplicação deve permitir:

- criar e planear eventos;
- definir os dias e horários de cada evento;
- preparar a ementa;
- gerir produtos e fornecedores;
- estimar compras;
- registar compras;
- acompanhar vendas;
- controlar stock;
- registar consumos, desperdícios e correções;
- acompanhar despesas;
- calcular resultados financeiros;
- gerir devoluções;
- consultar informação através de dashboard;
- guardar notas sobre cada evento;
- encerrar eventos;
- gerar um relatório final;
- consultar eventos anteriores.

Um dos objetivos principais é evitar:
- falta de produto;
- compras em excesso;
- desperdício;
- dificuldade em interpretar resultados de eventos anteriores.

---

## 4. Tecnologias definidas

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express

### Base de dados
- MySQL

### Controlo de versões
- Git
- GitHub

Não utilizar PHP.

Não substituir estas tecnologias sem confirmação.

---

## 5. Estrutura do repositório

```text
Gest_Eventos_B_S/
│
├── CLAUDE.md
├── README.md
│
├── Docs/
│   ├── README.md
│   ├── Requisitos.md
│   ├── US01-criar-evento.md
│   ├── casos_de_uso_bebe_e_siga.puml
│   └── BPMN/
│       ├── criar-evento.bpmn
│       ├── criar-evento.svg
│       └── criar-evento.png
│
├── Frontend/
│   ├── login.html
│   ├── registo.html
│   ├── marca.html
│   ├── utilizadores.html
│   ├── css/
│   ├── img/
│   └── js/
│
├── Backend/
│   └── README.md
│
└── Database/
    ├── README.md
    └── bebe_e_siga.sql
```

Antes de reorganizar ficheiros, analisar primeiro a estrutura atual.

---

## 6. Perfis de utilizador e RBAC

A aplicação utiliza **RBAC — Role-Based Access Control**.

Existem três perfis.

### Administrador

Tem acesso a todas as funcionalidades.

É o único perfil que pode:
- criar utilizadores;
- editar utilizadores;
- gerir perfis/permissões.

### Gestor

Pode executar as funções de gestão do evento, mas não pode gerir utilizadores.

Pode, entre outras funções:
- criar eventos;
- gerir produtos;
- gerir ementas;
- gerir fornecedores;
- registar compras;
- corrigir stock;
- gerir despesas;
- consultar resultados financeiros;
- registar devoluções;
- reabrir dias;
- encerrar eventos.

### Colaborador

Tem um acesso mais limitado.

Pode principalmente:
- registar vendas;
- registar consumo interno;
- consultar informação operacional autorizada.

Não deve poder consultar informação financeira sensível nem alterar configurações de gestão.

As permissões devem ser validadas no **backend**, e não apenas escondidas na interface.

---

## 7. Regras dos eventos

Cada evento é independente.

Os produtos, fornecedores e histórico podem ser partilhados entre eventos.

Ao criar um evento, são obrigatórios:
- nome;
- local;
- dias do evento.

Podem também existir:
- horários;
- previsão de público;
- orçamento;
- despesas iniciais;
- tipo de espaço: interior, exterior ou misto.

Os dias podem ser consecutivos ou não consecutivos.

Os horários podem variar entre dias.

---

## 8. Regra importante dos dias e vendas

As vendas devem ser associadas **manualmente ao dia operacional do evento**.

Exemplo:

Um evento funciona das 20h00 às 02h00.

Uma venda registada às 01h30 pode continuar a pertencer ao dia operacional anterior.

Por isso, não utilizar apenas a data/hora do sistema para decidir automaticamente a que dia pertence uma venda.

---

## 9. Ementa e artigos

Cada evento pode ter uma ementa própria.

A ementa pode:
- ser criada de raiz;
- ser copiada de um evento anterior.

Um artigo pode ter:
- nome;
- categoria;
- preço;
- fotografia opcional;
- tipo.

Categorias previstas:
- bebidas;
- cocktails;
- comida;
- shots;
- outros.

Existem dois tipos principais de artigo:

### Venda direta
Exemplo: cerveja engarrafada.

### Artigo composto
Exemplo: Mojito.

Um artigo composto deve ter uma receita/dose associada.

Nesta fase não implementar combinações complexas como um artigo composto por outro artigo.

---

## 10. Produtos, unidades e doses

Unidades principais:
- unidade;
- grama;
- mililitro.

Conversões:
- 1 L = 1000 ml;
- 1 kg = 1000 g.

Exemplo:

Um barril de 30 L corresponde a 30000 ml.

Um fino pode ter:
- 200 ml servidos ao cliente;
- 220 ml descontados do stock para considerar perdas médias.

As doses podem variar de evento para evento.

---

## 11. Produtos residuais

Alguns produtos podem ser considerados de consumo residual.

Exemplos:
- sal;
- açúcar;
- hortelã.

Estes produtos:
- entram nos custos;
- podem ser comprados;
- podem existir em stock;
- não precisam de ser descontados automaticamente por cada venda.

Também deve existir a possibilidade de indicar se um produto é perecível.

---

## 12. Fornecedores

Cada fornecedor deve poder ter:
- nome;
- contacto;
- email opcional;
- NIF opcional;
- morada opcional;
- indicação se aceita devoluções.

Um fornecedor pode fornecer vários produtos.

Um produto pode ter:
- um fornecedor principal;
- fornecedores alternativos.

Guardar histórico de preços sempre que fizer sentido.

Guardar qual fornecedor foi utilizado numa compra/evento.

---

## 13. Compras

As compras podem ser registadas:
- antes do evento;
- durante o evento.

Cada compra deve ficar associada:
- ao evento;
- ao fornecedor;
- aos produtos;
- às quantidades;
- aos preços.

Uma compra aumenta automaticamente o stock.

Nesta fase, cada evento começa com o seu próprio stock resultante das compras associadas ao evento.

---

## 14. Previsão de compras

A aplicação deve permitir usar edições anteriores do mesmo evento como referência.

Exemplo:
- Festa do Mar 2026;
- Festa do Mar 2027.

Deve existir forma de relacionar diferentes edições do mesmo evento.

A aplicação pode sugerir quantidades com base no histórico.

Deve existir uma margem de segurança ajustável.

Se não existir histórico, a quantidade deve poder ser introduzida manualmente.

Para o MVP, pode ser usada como principal referência a edição imediatamente anterior.

Não criar uma fórmula complexa de previsão sem confirmação.

---

## 15. Vendas

As vendas podem ser registadas:
- individualmente;
- através de uma quantidade total por artigo.

Exemplo:
- 1000 cervejas vendidas.

O sistema calcula:
- quantidade x preço;
- faturação;
- consumo de stock.

Em artigos compostos, devem ser descontados os ingredientes da receita, exceto produtos marcados como residuais.

Guardar:
- dia do evento;
- artigo;
- quantidade;
- preço usado na venda;
- utilizador responsável.

---

## 16. Histórico e integridade dos dados

Dados históricos nunca devem ser alterados por mudanças futuras.

Exemplo:

Se um Mojito custava 5 € num evento anterior e passa a custar 6 €, as vendas antigas continuam com o preço de 5 €.

A mesma regra aplica-se a:
- receitas;
- doses;
- preços;
- compras;
- movimentos de stock.

---

## 17. Stock

Movimentos que podem alterar stock:
- compras;
- vendas;
- consumo interno;
- ofertas;
- quebras;
- desperdícios;
- devoluções;
- correções manuais.

Pode existir stock mínimo por produto.

Quando o valor atingir ou ficar abaixo do mínimo, deve surgir um alerta.

Correções manuais só podem ser feitas por Administrador ou Gestor.

Guardar:
- quantidade anterior;
- nova quantidade;
- motivo;
- utilizador responsável.

---

## 18. Fecho diário

Cada dia do evento deve poder ser fechado.

Um dia fechado fica bloqueado para novos registos.

Administrador e Gestor podem:
1. reabrir;
2. corrigir;
3. voltar a fechar.

O fecho deve permitir consultar, entre outros:
- faturação do dia;
- artigo mais vendido;
- notas opcionais.

---

## 19. Despesas

As despesas podem ser:
- fixas;
- variáveis.

Podem ficar associadas:
- ao evento;
- a um dia específico.

Exemplos:
- aluguer;
- licenças;
- eletricidade;
- pessoal;
- decoração;
- transporte.

Evitar contar uma compra duas vezes no cálculo das despesas.

---

## 20. Resultados financeiros

A aplicação deve permitir acompanhar:
- faturação;
- despesas;
- orçamento;
- valor gasto;
- devoluções;
- resultado estimado;
- stock restante.

O valor de stock restante deve poder ser apresentado separadamente do valor efetivamente consumido.

---

## 21. Devoluções

Só devem ser permitidas quando o fornecedor aceita devoluções.

Apenas produtos/embalagens fechadas devem ser considerados devolvíveis.

O sistema pode calcular uma quantidade potencialmente devolvível, mas a quantidade real deve ser confirmada pelo utilizador.

O valor devolvido:
- reduz o custo efetivo da compra;
- atualiza o resultado financeiro.

---

## 22. Dashboard

Dar maior destaque a:
- faturação acumulada;
- resultado estimado;
- stock baixo.

Também podem existir:
- gráfico de faturação por dia;
- gráfico de artigos mais vendidos.

O conteúdo deve respeitar as permissões do perfil.

---

## 23. Notas

Permitir notas:
- diárias;
- finais.

Podem registar:
- meteorologia;
- chuva;
- calor;
- afluência;
- produtos esgotados;
- excesso de stock;
- problemas com fornecedores;
- horários de maior movimento;
- acontecimentos externos.

Estas notas ajudam a interpretar os resultados.

Não calcular automaticamente o impacto da meteorologia.

---

## 24. Encerramento do evento

O encerramento é manual.

Apenas Administrador e Gestor podem encerrar.

Antes do encerramento:
- todos os dias devem estar fechados.

A contagem física final de stock pode ser opcional.

Depois do encerramento ainda podem existir correções e devoluções dentro do período permitido.

---

## 25. Prazo de edição

O evento pode ser editado durante **um mês após o último dia do evento**.

Depois desse período:
- fica apenas para consulta;
- o histórico permanece disponível sem limite de tempo.

---

## 26. Relatório final

A aplicação deve permitir gerar um PDF final do evento.

Pode incluir:
- vendas;
- faturação;
- despesas;
- stock;
- devoluções;
- notas.

Se existirem correções dentro do prazo, o relatório pode ser novamente gerado.

---

## 27. Interface

Identidade visual:
- fundo branco;
- botões pretos;
- detalhes vermelhos.

Características:
- simples;
- profissional;
- responsiva;
- adequada a computador, tablet e telemóvel.

Não implementar modo escuro nesta fase.

Os botões usados durante o evento devem ser fáceis de utilizar, mas sem ocupar espaço exagerado.

---

## 28. Requisitos funcionais — resumo

- RF01 — Autenticação
- RF02 — Gestão de utilizadores
- RF03 — Gestão de permissões
- RF04 — Criar evento
- RF05 — Configurar dias do evento
- RF06 — Calendário
- RF07 — Gestão de produtos
- RF08 — Gestão de ementa
- RF09 — Composição dos artigos
- RF10 — Reutilização de ementa
- RF11 — Gestão de fornecedores
- RF12 — Registo de compras
- RF13 — Previsão de compras
- RF14 — Registo de vendas
- RF15 — Atualização de stock
- RF16 — Consumos e desperdícios
- RF17 — Correção de stock
- RF18 — Alertas de stock baixo
- RF19 — Fecho e reabertura diária
- RF20 — Gestão de despesas
- RF21 — Resultados financeiros
- RF22 — Devoluções
- RF23 — Dashboard
- RF24 — Notas
- RF25 — Encerramento do evento
- RF26 — Prazo de edição
- RF27 — Relatório final
- RF28 — Histórico
- RF29 — Consultar ementa
- RF30 — Consultar faturação diária
- RF31 — Registar marca

---

## 29. Requisitos não funcionais — resumo

- aplicação responsiva;
- compatível com Chrome e Edge;
- navegação simples;
- identidade visual Bebe e Siga;
- login obrigatório;
- passwords com hash;
- RBAC;
- controlo de sessão;
- bom desempenho;
- utilização online;
- persistência em MySQL.

---

## 30. Estado atual do projeto

Já existe um repositório GitHub chamado:

`Gest_Eventos_B_S`

Sprint 1 (apresentada a 8 de outubro de 2026):
- requisitos em `Docs/Requisitos.md` (RF01 a RF31 e RNF01 a RNF11);
- diagrama de casos de uso e diagrama BPMN do processo Criar evento em `Docs/`;
- módulo de acesso no frontend: registo de marca com funções, email e palavra-passe (UC03), login (UC01), página da marca por perfil e gestão de utilizadores (UC02).

Nesta fase o frontend guarda os dados no navegador (`localStorage` e `sessionStorage`) e protege as palavras-passe com hash SHA-256 e sal. As permissões ainda só são verificadas no navegador.

A versão final deverá utilizar:
- backend Node.js/Express;
- MySQL (script inicial em `Database/bebe_e_siga.sql`);
- autenticação real;
- passwords protegidas com bcrypt no servidor;
- permissões RBAC validadas no backend.

---

## 31. Prioridade atual

A prioridade seguinte é desenvolver o módulo **Planear**.

Ordem sugerida:

1. Criar evento
2. Definir dias e horários
3. Registar orçamento e despesas iniciais
4. Criar ou copiar ementa
5. Selecionar/criar produtos
6. Definir artigos e receitas
7. Associar fornecedores
8. Registar compras iniciais
9. Consultar previsão de compras
10. Ajustar margem de segurança
11. Rever resumo do planeamento
12. Guardar o evento

Não desenvolver toda a aplicação de uma só vez.

---

## 32. Regras de escrita do código

### Geral

- Código simples e legível.
- Evitar complexidade desnecessária.
- Não inventar funcionalidades.
- Não alterar regras de negócio sem confirmação.
- Evitar duplicação de código quando for simples reutilizar.
- Funções pequenas e com responsabilidade clara.

### JavaScript

Usar `camelCase`.

Exemplo:

```javascript
const eventName = "Festa do Mar";

function calculateTotal() {
    // ...
}
```

Preferir:
- `const`;
- `let` quando necessário.

Evitar:
- `var`;
- nomes como `x`, `a`, `teste1`, sem significado.

### Base de dados

Usar `snake_case`.

Exemplo:

```text
event_id
event_name
user_id
start_date
```

Usar:
- chaves primárias;
- chaves estrangeiras quando necessário;
- queries parametrizadas.

Nunca construir SQL diretamente com dados introduzidos pelo utilizador.

### Segurança

Nunca guardar no GitHub:
- passwords;
- tokens;
- chaves;
- credenciais.

Usar `.env`.

O `.env` deve estar no `.gitignore`.

Pode existir `.env.example` sem valores reais.

Passwords devem ser guardadas com hash.

---

## 33. Regras para trabalhar neste repositório

Antes de alterar código:

1. Ler este ficheiro (as regras de escrita do código estão na secção 32).
2. Ler `Docs/Requisitos.md`.
3. Analisar os ficheiros atuais.
4. Perceber o que já funciona.
5. Evitar alterar áreas não relacionadas com a tarefa.

Quando a tarefa for pequena e estiver claramente pedida, pode ser implementada diretamente.

Antes de alterações grandes:
- explicar a proposta;
- indicar os ficheiros que serão alterados;
- esperar confirmação.

Depois de cada alteração, indicar:
- ficheiros criados;
- ficheiros alterados;
- o que foi feito;
- como testar;
- limitações conhecidas.

---

## 34. Git e commits

Fazer commits pequenos e claros.

Exemplos:

```text
Criar formulário de novo evento
Adicionar tabela de fornecedores
Adicionar registo de compras
Corrigir cálculo do stock
```

Evitar:

```text
alterações
teste
final
final2
coisas
```

Não misturar muitas funcionalidades diferentes no mesmo commit.

---

## 35. Regra final para o Claude

Não assumir decisões que não estão descritas neste documento.

Quando existir dúvida funcional:
- perguntar antes de implementar.

Quando existir mais do que uma solução técnica:
- preferir a mais simples que cumpra os requisitos;
- explicar resumidamente a escolha.

O objetivo não é criar a aplicação mais complexa possível.

O objetivo é criar uma aplicação funcional, organizada, coerente com os requisitos e que a equipa consiga compreender e apresentar.
