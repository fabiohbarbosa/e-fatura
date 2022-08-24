# E-Fatura

## Como usar?

1. Fazer login no portal e-fatura
2. Consultar as faturas pendentes através da página: https://faturas.portaldasfinancas.gov.pt/consultarDocumentosAdquirente.action
3. Copiar o valor do cookie da request acima e inseri-lo em `src/config/cookie`.
4. Atualizar a aquisição da fatura através da request abaixo:
```
curl --location --request PATCH 'http://localhost:3000/e-fatura/:nif/:aquisicao'
```
