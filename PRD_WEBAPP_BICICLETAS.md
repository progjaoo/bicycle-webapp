# PRD - Web App de Tabela de Preços de Bicicletas

## 1. Objetivo
Criar um web app sem autenticação para um cliente que trabalha com uma tabela de preços de bicicletas e precisa ajustar três parâmetros globais, visualizar os preços recalculados em tempo real e exportar um arquivo Excel final formatado, mantendo a estrutura visual da planilha original.

O app deve substituir o trabalho manual atual feito em Excel por uma interface web simples, rápida e segura para operação diária.

## 2. Contexto do Negócio
O cliente usa uma planilha de preços com lógica de cálculo em cascata para transformar um preço base em EUR em:

- custo atualizado do distribuidor
- preço final de venda
- valores convertidos pela taxa de câmbio

A operação atual depende de editar células no Excel. O objetivo é transformar isso em um painel web interativo que preserve a lógica da planilha e gere o Excel final já pronto para envio.

## 3. Arquivos de Referência
Usar estes arquivos como base real do projeto:

- `PricesBH_2026_Dinamica.xlsx`: planilha mestre com painel de controle, coluna base em EUR e fórmulas
- `PricesBH_2026_AED_Final_v4-atualizada_22-04-2026.xlsx`: exemplo do formato final exportado

## 4. Estrutura Real da Planilha Atual
O app deve respeitar a estrutura da planilha fornecida, não inventar uma nova.

### 4.1 Estrutura da planilha dinâmica
- 1 aba: `Hoja1`
- Intervalo total: `A1:I211`
- Título do painel em `A1:G1`: `PAINEL DE CONTROLE - AJUSTE DE PREÇOS`
- Campos editáveis:
- `B2`: Markup Compra (%)
- `B3`: Margem Venda (%)
- `B4`: Taxa Conversão (x)
- Cabeçalho principal em linha 7:
- `A`: CODE
- `B`: DESC.
- `C`: SPECS
- `D`: SIZES
- `E`: BHU
- `F`: Sales
- `G`: Distributor cost (STANDARD)
- `I`: BASE EURO (OCULTA / coluna técnica)
- A coluna `H` é apenas espaçadora
- A coluna `I` contém o preço base em EUR e não deve aparecer no dashboard para o usuário final

### 4.2 Categorias reais presentes
- E-BIKES: 82 produtos
- MTB: 33 produtos
- ROAD: 34 produtos
- TREKKING / URBAN: 12 produtos
- KIDS: 5 produtos
- MONTY: 27 produtos

Total real: 193 SKUs.

### 4.3 Fórmulas reais
Na planilha dinâmica, a regra é:

- `Distributor cost (STANDARD)` = `BASE EURO * (1 + Markup Compra) * Taxa Conversão`
- `Sales` = `Distributor cost (STANDARD) * (1 + Margem Venda)`

Forma equivalente:

- `custoAtualizado = precoBaseEUR * (1 + markupCompra)`
- `custoConvertido = custoAtualizado * taxaConversao`
- `venda = custoConvertido * (1 + margemVenda)`

Para o app, usar esta versão consolidada:

```text
cost = baseEuro * (1 + markupCompra) * taxaConversao
sale = cost * (1 + margemVenda)
```

Observação: os percentuais devem ser inseridos no app como valores humanos, por exemplo:

- `6.5` = 6,5%
- `45` = 45%

Internamente, converter para decimal:

- `6.5` -> `0.065`
- `45` -> `0.45`

### 4.4 Estilo visual que precisa ser preservado
- Células de entrada do painel em amarelo claro: `#FFFFCC`
- Coluna `Sales` em verde claro: `#CCFFCC`
- Coluna `Distributor cost (STANDARD)` em vermelho claro: `#FFCCCC`
- Título do painel em azul: `#4472C4`
- Bordas médias e estrutura tabular devem ser preservadas no Excel exportado
- Larguras de colunas devem seguir a planilha original
- Ordem dos produtos e separação por categoria devem ser mantidas

## 5. Objetivo do Produto
Permitir que o operador:

- altere markup de compra
- altere margem de venda
- altere taxa de conversão de moeda
- veja a tabela recalculada imediatamente
- exporte um arquivo `.xlsx` final já formatado

Sem login, sem banco de dados, sem fluxo administrativo.

## 6. Escopo do MVP
Entregar uma única página com:

- painel de controle no topo ou lateral
- tabela principal com preview em tempo real
- botão de exportação para Excel
- botão para restaurar valores padrão

## 7. Requisitos Funcionais

### RF-01. Carregar base inicial
Ao abrir o app, carregar a base da planilha `PricesBH_2026_Dinamica.xlsx` já embutida no projeto.

Valores padrão iniciais:

- Markup Compra: `6.5%`
- Margem Venda: `45%`
- Taxa Conversão: `4.4`

### RF-02. Painel de controle interativo
O dashboard deve ter 3 campos numéricos editáveis:

- `Markup Compra (%)`
- `Margem Venda (%)`
- `Taxa Conversão`

Regras:

- aceitar casas decimais
- recalcular ao digitar
- validar valores inválidos
- mostrar erro se a taxa for `<= 0`

### RF-03. Preview em tempo real
A tabela principal deve recalcular instantaneamente ao alterar qualquer parâmetro.

Cada linha de produto deve mostrar:

- código
- descrição
- especificações
- tamanhos
- BHU
- venda recalculada
- custo recalculado

A coluna base em EUR deve continuar interna e não aparecer para o usuário.

### RF-04. Preservar agrupamento por categoria
O preview deve manter os blocos de categoria:

- E-BIKES
- MTB
- ROAD
- TREKKING / URBAN
- KIDS
- MONTY

As linhas de categoria devem aparecer visualmente destacadas e sem valores calculados.

### RF-05. Exportar Excel final
Ao clicar em `Exportar Excel`, gerar um arquivo `.xlsx` baixável com estas regras:

- sem o painel de controle
- sem fórmulas
- com valores finais já calculados
- com a mesma ordem dos produtos
- com as categorias preservadas
- com bordas preservadas
- com larguras de coluna preservadas
- com `Sales` em verde
- com `Distributor cost (STANDARD)` em vermelho
- com layout equivalente ao arquivo final de referência

### RF-06. Nome do arquivo exportado
Usar um nome de arquivo legível, por exemplo:

`PricesBH_2026_AED_Final.xlsx`

Se houver um campo opcional de moeda destino, usar esse valor no nome do arquivo.

### RF-07. Reset de parâmetros
Disponibilizar botão `Restaurar padrão` para voltar aos valores:

- 6.5
- 45
- 4.4

## 8. Requisitos de Interface

### UI-01. Página única
Criar uma página única, limpa e operacional, sem autenticação.

### UI-02. Layout
Sugestão:

- topo com título do sistema
- painel de parâmetros em cards ou bloco fixo
- tabela abaixo com scroll horizontal quando necessário
- botão de exportação visível acima da tabela

### UI-03. Experiência de uso
- interface direta, sem etapas extras
- alterações refletidas em menos de 150 ms para a base inteira
- compatível com desktop
- responsivo o suficiente para tablet

### UI-04. Indicadores visuais
- usar destaque de cor nos inputs
- usar badge ou texto auxiliar explicando que os valores são recalculados em tempo real
- exibir percentuais com máscara amigável

## 9. Regras de Negócio

### RB-01. Conversão de percentuais
Campos percentuais entram em formato humano e devem ser convertidos internamente para decimal:

```text
markupDecimal = markupPercent / 100
margemDecimal = margemPercent / 100
```

### RB-02. Cálculo por linha
Para cada produto:

```text
cost = baseEuro * (1 + markupDecimal) * taxaConversao
sale = cost * (1 + margemDecimal)
```

### RB-03. Precisão
- manter precisão interna suficiente para cálculo
- exibir no preview com 2 casas decimais
- exportar o Excel final com 2 casas decimais

### RB-04. Dados imutáveis por SKU
Os seguintes campos não são editáveis no MVP:

- código
- descrição
- specs
- sizes
- BHU
- base EUR
- categorias

## 10. Requisitos Técnicos

### TEC-01. Fonte dos dados
Transformar a planilha dinâmica em uma estrutura de dados interna contendo:

- metadados do template
- categorias
- produtos
- `baseEuro`

### TEC-02. Estratégia de exportação
Não gerar o Excel do zero se isso comprometer bordas, estilos e larguras.

Abordagem recomendada:

- usar o arquivo de referência como template de estilo
- preencher apenas as células variáveis
- exportar um `.xlsx` real
- gravar valores estáticos no arquivo final

### TEC-03. Tecnologia recomendada
Stack sugerida para facilitar no Replit:

- frontend web com React
- backend simples para geração do Excel
- biblioteca de Excel que preserve estilo com fidelidade, como `openpyxl`, `xlsx-populate` ou equivalente

### TEC-04. Sem autenticação
- não implementar login
- não implementar permissões
- não implementar banco de dados no MVP

## 11. Critérios de Aceite
O projeto será considerado pronto quando:

1. O app abrir já com a tabela carregada.
2. O usuário puder alterar `Markup Compra`, `Margem Venda` e `Taxa Conversão`.
3. Os valores de `Sales` e `Distributor cost (STANDARD)` forem recalculados imediatamente.
4. O preview mantiver as 6 categorias e os 193 produtos.
5. A coluna base EUR não aparecer para o usuário.
6. O Excel exportado abrir normalmente no Excel.
7. O Excel exportado sair com valores estáticos, sem depender de fórmulas.
8. O Excel exportado preservar cores, bordas, colunas e estrutura visual.
9. O Excel exportado seguir o formato do arquivo final de referência.

## 12. Fora de Escopo
- autenticação
- multiusuário
- banco de dados
- edição de SKUs manualmente no dashboard
- upload de novas planilhas pelo usuário final
- histórico de versões
- relatórios extras

## 13. Requisitos Opcionais, se couber no MVP
- campo textual `Moeda destino` apenas para rotular o arquivo exportado
- busca por código ou descrição
- filtro por categoria
- botão `Copiar link do arquivo exportado`

## 14. Prompt Direto Para Enviar ao Replit
Copie o texto abaixo para o Replit:

```text
Crie um web app sem autenticação para gestão de tabela de preços de bicicletas, usando como referência os arquivos PricesBH_2026_Dinamica.xlsx e PricesBH_2026_AED_Final_v4-atualizada_22-04-2026.xlsx.

Objetivo:
Quero uma única página interativa onde o usuário altera 3 parâmetros globais:
- Markup Compra (%)
- Margem Venda (%)
- Taxa Conversão

Ao alterar esses campos, a tabela deve recalcular em tempo real os preços de todos os produtos.

Estrutura real da base:
- 1 aba
- 193 produtos
- 6 categorias: E-BIKES, MTB, ROAD, TREKKING / URBAN, KIDS, MONTY
- colunas visíveis no dashboard: CODE, DESC., SPECS, SIZES, BHU, Sales, Distributor cost (STANDARD)
- coluna técnica interna: BASE EURO

Regra de cálculo:
- markupDecimal = markupPercent / 100
- margemDecimal = margemPercent / 100
- cost = baseEuro * (1 + markupDecimal) * taxaConversao
- sale = cost * (1 + margemDecimal)

Requisitos principais:
- sem login
- preview em tempo real
- tabela mantendo categorias e ordem original
- coluna base EUR oculta do usuário
- botão Restaurar padrão
- botão Exportar Excel

Exportação Excel:
- gerar um arquivo .xlsx real
- sem painel de controle
- sem fórmulas
- com valores finais estáticos
- preservar estrutura visual do arquivo final de referência
- preservar larguras, bordas e ordem das linhas
- coluna Sales em verde claro (#CCFFCC)
- coluna Distributor cost (STANDARD) em vermelho claro (#FFCCCC)

Valores padrão iniciais:
- Markup Compra = 6.5
- Margem Venda = 45
- Taxa Conversão = 4.4

Critérios de aceite:
- o preview recalcula instantaneamente
- o Excel exportado abre corretamente no Excel
- o Excel exportado mantém o layout da planilha final de referência
- o usuário consegue operar tudo em uma única página

Sugestão técnica:
- frontend React
- backend simples apenas para geração do Excel
- usar biblioteca de Excel que preserve estilos com fidelidade, como openpyxl, xlsx-populate ou equivalente

Entregue o app funcional já com a planilha carregada no projeto e com a exportação funcionando.
```

