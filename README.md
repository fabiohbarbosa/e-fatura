# E-Fatura

## Instalação
Para instalar as dependências, execute:
```bash
yarn install
```


## Executar o projeto
Para iniciar o projeto em ambiente de desenvolvimento, utilize:

```bash
yarn start:dev
```

## Como usar?

1. Configure os anos que deseja consultar as faturas no arquivo `src/config/props.ts` em `years`. (É recomendado no mínimo o atual corrente e o anterior)
2. Faça login no portal **e-fatura**
2. Consulte as faturas pendentes acessando a página: https://faturas.portaldasfinancas.gov.pt/consultarDocumentosAdquirente.action
3. Copie o valor do cookie da requisição e insira-o em `src/config/cookie`
4. Atualize a aquisição da fatura com o seguinte comando:

```bash
curl --location --request PATCH 'http://localhost:3000/e-fatura'
```

## Como funciona?
A aplicação consulta faturas com status `Registado` e salva o NIF do comerciante e sua atividade na base de dados.

Quanto mais anos você consultar, mais comerciantes e atividades serão salvos.


Por exemplo, se o comerciante for:
```
Auchan Retail Portugal, S.A. 
NIF=502607920
Atividade=C99
```

Ele será salvo da seguinte maneira:

```json
{
  "comerciantes": {
    "502607920": "C99"
  }
}

```

Para consultar faturas de anos específicos, adicione os anos desejados no arquivo `src/config/props.ts`, no campo `years`. 
Assim, você poderá alimentar a base de dados com os comerciantes e suas atividades.

Se houver novas faturas de um comerciante e você desejar inserir sua atividade na aplicação, 
basta preencher uma fatura no portal `e-fatura` e atualizar a aplicação utilizando a requisição mencionada no passo **Como usar?**.

## Backup
Caso deseje fazer um backup da base de dados, basta salvar o arquivo `db.json` que está na raiz do projeto.

```bash


## Dúvidas

Caso tenha alguma dúvida, entre em contato pelo email: `fabiohbarbosa@gmail.com`.