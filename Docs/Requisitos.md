# Requisitos do Projeto — Bebe e Siga

Este documento reúne os requisitos da aplicação Bebe e Siga.

A aplicação foi pensada para apoiar o planeamento e a gestão de eventos temporários, desde a preparação até à análise final.

# Levantamento de requisitos

## Como foram levantados

Os requisitos partem do caso real da marca de eventos Bebe e Siga e da forma como a marca prepara e acompanha os seus eventos: escolher a ementa, comprar aos fornecedores, vender durante o evento, controlar o stock e fechar as contas de cada dia.

A partir daí foram escritos os requisitos funcionais e não funcionais. Depois foram revistos e simplificados, e os casos de uso foram desenhados a partir deles. Os requisitos são validados com o professor, no papel de cliente, nas apresentações de cada sprint.

## Atores

| Ator | Descrição |
| --- | --- |
| Visitante | Pessoa que ainda não entrou na aplicação. Pode registar a marca e iniciar sessão. |
| Colaborador | Trabalha durante o evento. Regista vendas e consumos e consulta a ementa e a faturação do dia. Não vê custos nem lucro. |
| Gestor | Planeia e gere os eventos: ementa, produtos, fornecedores, compras, stock, despesas, fecho dos dias e resultados. Tem também as permissões do Colaborador. |
| Administrador | Tem acesso total, incluindo a gestão dos utilizadores da marca. Tem também as permissões do Gestor. |

## Prioridades

As prioridades seguem o método MoSCoW:

- **Must**: obrigatório para a aplicação cumprir o seu objetivo.
- **Should**: importante, mas a aplicação funciona sem ele numa primeira versão.

| ID | Requisito | Prioridade |
| --- | --- | --- |
| RF01 | Autenticação | Must |
| RF02 | Gestão de utilizadores | Must |
| RF03 | Gestão de permissões | Must |
| RF04 | Criar evento | Must |
| RF05 | Configurar dias do evento | Must |
| RF06 | Calendário | Should |
| RF07 | Gestão de produtos | Must |
| RF08 | Gestão de ementa | Must |
| RF09 | Composição dos artigos | Must |
| RF10 | Reutilização de ementa | Should |
| RF11 | Gestão de fornecedores | Must |
| RF12 | Registo de compras | Must |
| RF13 | Previsão de compras | Should |
| RF14 | Registo de vendas | Must |
| RF15 | Atualização de stock | Must |
| RF16 | Consumos e desperdícios | Should |
| RF17 | Correção de stock | Should |
| RF18 | Stock baixo | Should |
| RF19 | Fecho diário | Must |
| RF20 | Gestão de despesas | Must |
| RF21 | Resultados financeiros | Must |
| RF22 | Devoluções | Should |
| RF23 | Dashboard | Should |
| RF24 | Notas | Should |
| RF25 | Encerramento do evento | Must |
| RF26 | Prazo de edição | Should |
| RF27 | Relatório final | Should |
| RF28 | Histórico | Must |
| RF29 | Consultar ementa | Should |
| RF30 | Consultar faturação diária | Should |
| RF31 | Registar marca | Must |

# Requisitos Funcionais

## RF01 — Autenticação

Permitir que o utilizador inicie e termine sessão.

## RF02 — Gestão de utilizadores

Permitir ao Administrador criar e gerir utilizadores.

## RF03 — Gestão de permissões

Aplicar as permissões correspondentes aos perfis de Administrador, Gestor e Colaborador.

## RF04 — Criar evento

Permitir criar um novo evento.

O evento deve incluir, no mínimo:

- Nome
- Local
- Dias de realização

Também podem ser adicionadas outras informações, como:

- Horários
- Tipo de espaço
- Previsão de público
- Orçamento disponível
- Despesas iniciais

## RF05 — Configurar dias do evento

Permitir definir os dias de realização do evento.

Os dias podem ser consecutivos ou não consecutivos.

Os horários são opcionais e podem variar de dia para dia.

As vendas ficam associadas ao dia escolhido manualmente pelo utilizador.

## RF06 — Calendário

Permitir consultar eventos e respetivos dias através de um calendário.

## RF07 — Gestão de produtos

Permitir criar e editar produtos utilizados nos eventos.

Podem ser registadas informações como:

- Nome
- Unidade
- Quantidade por embalagem
- Stock mínimo
- Produto perecível
- Tipo de consumo
- Fornecedor principal

## RF08 — Gestão de ementa

Permitir criar uma ementa própria para cada evento.

Cada artigo pode incluir:

- Nome
- Categoria
- Preço
- Fotografia opcional
- Tipo de artigo

## RF09 — Composição dos artigos

Permitir definir os produtos e respetivas quantidades utilizadas num artigo composto.

Exemplo:

Um Mojito pode utilizar rum, lima e outros ingredientes.

## RF10 — Reutilização de ementa

Permitir copiar uma ementa de um evento anterior.

A cópia pode ser alterada sem modificar os dados históricos do evento original.

## RF11 — Gestão de fornecedores

Permitir registar fornecedores e consultar os produtos fornecidos por cada um.

Cada produto pode ter:

- Um fornecedor principal
- Fornecedores alternativos

Também deve ser possível guardar preços e consultar o respetivo histórico.

## RF12 — Registo de compras

Permitir registar compras antes e durante o evento.

Cada compra deve ficar associada ao evento e ao fornecedor.

O stock deve ser atualizado automaticamente.

## RF13 — Previsão de compras

Permitir utilizar dados de edições anteriores do mesmo evento para sugerir quantidades de compra.

O utilizador deve poder ajustar as quantidades sugeridas.

Também deve ser possível aplicar uma margem de segurança.

## RF14 — Registo de vendas

Permitir registar vendas por dia.

As vendas podem ser registadas:

- Individualmente
- Através da quantidade total vendida de um artigo

A aplicação deve calcular automaticamente a faturação correspondente.

## RF15 — Atualização de stock

Atualizar automaticamente o stock através dos movimentos registados.

Exemplos:

- Compras
- Vendas
- Devoluções
- Consumos
- Desperdícios
- Correções

## RF16 — Consumos e desperdícios

Permitir registar movimentos que diminuem o stock sem gerar faturação.

Exemplos:

- Consumo interno
- Ofertas
- Quebras
- Desperdícios

## RF17 — Correção de stock

Permitir ao Administrador e ao Gestor corrigir manualmente o stock.

A correção deve guardar:

- Quantidade anterior
- Nova quantidade
- Motivo
- Utilizador responsável

## RF18 — Stock baixo

Apresentar um alerta quando um produto atingir ou ficar abaixo do stock mínimo definido.

## RF19 — Fecho diário

Permitir fechar individualmente cada dia do evento.

Depois de fechado, o dia fica bloqueado para alterações.

O Administrador e o Gestor podem:

- Reabrir o dia
- Corrigir informação
- Voltar a fechá-lo

## RF20 — Gestão de despesas

Permitir registar despesas fixas e variáveis.

As despesas podem estar associadas:

- Ao evento completo
- A um dia específico

## RF21 — Resultados financeiros

Permitir consultar informação financeira do evento.

Exemplos:

- Faturação
- Despesas
- Orçamento
- Valor gasto
- Resultado estimado
- Stock restante

## RF22 — Devoluções

Permitir registar a devolução de produtos fechados quando o fornecedor aceita devoluções.

O valor devolvido deve reduzir o custo efetivo do evento.

## RF23 — Dashboard

Apresentar os principais indicadores do evento.

Devem ter maior destaque:

- Faturação acumulada
- Resultado estimado
- Stock baixo

Também podem existir gráficos de:

- Faturação por dia
- Artigos mais vendidos

## RF24 — Notas

Permitir guardar notas diárias e finais.

As notas podem incluir informações sobre:

- Meteorologia
- Afluência
- Produtos esgotados
- Excesso de stock
- Problemas com fornecedores
- Outros acontecimentos relevantes

## RF25 — Encerramento do evento

Permitir encerrar manualmente o evento.

O evento só pode ser encerrado depois de todos os dias estarem fechados.

## RF26 — Prazo de edição

Permitir alterações durante um mês após o último dia do evento.

Depois desse período, o evento fica disponível apenas para consulta.

## RF27 — Relatório final

Permitir gerar um relatório final em PDF.

O relatório pode incluir:

- Vendas
- Faturação
- Despesas
- Stock
- Devoluções
- Notas

## RF28 — Histórico

Manter os eventos anteriores disponíveis para consulta.

O histórico pode ser utilizado como apoio ao planeamento de novas edições.

## RF29 — Consultar ementa

Permitir ao Colaborador consultar a ementa do evento, com os artigos e os respetivos preços.

Corresponde ao caso de uso UC29.

## RF30 — Consultar faturação diária

Permitir ao Colaborador consultar a faturação do dia.

O Colaborador não consulta custos nem lucro.

Corresponde ao caso de uso UC30.

## RF31 — Registar marca

Permitir que uma marca se registe na aplicação, indicando o nome e, opcionalmente, o logótipo.

No registo, a marca escolhe as funções que vai usar:

- Administrador (obrigatório)
- Gestor (opcional)
- Colaborador (opcional)

Cada função fica associada a um email e a uma palavra-passe.

Corresponde ao caso de uso UC03 (Criar conta).

# Requisitos Não Funcionais

## RNF01 — Responsividade

A aplicação deve adaptar-se a computador, tablet e telemóvel.

## RNF02 — Compatibilidade

A aplicação deve funcionar corretamente nos navegadores Chrome e Edge.

## RNF03 — Facilidade de utilização

A navegação deve ser simples, clara e fácil de compreender.

## RNF04 — Identidade visual

A aplicação deve seguir a identidade visual do Bebe e Siga.

Elementos principais:

- Fundo branco
- Botões pretos
- Detalhes a vermelho
- Interface simples e profissional

## RNF05 — Autenticação

O acesso à aplicação deve ser feito através de login.

## RNF06 — Proteção das passwords

As passwords não devem ser guardadas em texto simples.

Devem ser protegidas através de hash.

## RNF07 — Controlo de acessos

A aplicação utiliza um sistema RBAC — Role-Based Access Control.

Existem três perfis:

- Administrador
- Gestor
- Colaborador

Cada utilizador deve ter acesso apenas às funcionalidades permitidas pelo seu perfil.

## RNF08 — Gestão da sessão

A sessão deve terminar automaticamente após um período prolongado de inatividade.

## RNF09 — Desempenho

A aplicação deve apresentar tempos de resposta reduzidos.

Sempre que possível, as páginas deverão carregar em menos de 2 segundos em condições normais de utilização.

## RNF10 — Acesso online

A aplicação deve funcionar através de ligação à Internet, incluindo dados móveis.

## RNF11 — Base de dados

Os dados da aplicação devem ser guardados de forma persistente numa base de dados MySQL.

# Documentos relacionados

- `US01-criar-evento.md`: user story 01, Criar evento (RF04 e RF05).
- `casos_de_uso_bebe_e_siga.puml`: diagrama de casos de uso (também em `.png` e `.svg`).
- `BPMN/criar-evento.bpmn`: processo Criar evento em BPMN (também em `.png` e `.svg`).
