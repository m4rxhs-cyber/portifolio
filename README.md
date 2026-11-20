# Engineering Dark V2

Portfólio bilíngue de Quality Assurance de Neemias Sales, construído com Next.js 15 (App Router), React, TypeScript, Tailwind CSS e Lucide.

## Executar localmente

Use Node.js 20 ou superior.

```bash
npm ci
npm run dev
```

Abra http://localhost:3000. A raiz redireciona para `/pt`. A versão em inglês está em `/en`.

## Verificar

```bash
npm run lint
npm run build
```

Com o servidor local em execução, rode `npm run test:e2e` em outro terminal. Para validar uma porta diferente, passe `-- --config baseUrl=http://localhost:3100`.

## Estrutura

- `app/[locale]` reúne a página inicial e os metadados localizados.
- `components/Header.tsx` contém a navegação, incluindo o menu móvel e a alternância de idioma.
- `components/TestExecutionDashboard.tsx` renderiza o painel de simulação sobre a fotografia do notebook.
- `lib/home.ts` e `lib/content.ts` contêm os textos PT/EN e os dados profissionais.
- `public` contém as imagens WebP geradas para a V2 e o PDF vinculado pelo botão de currículo.
- `cypress/e2e/home.cy.js` verifica a página inicial, a troca de idioma e o menu móvel.

## Dados profissionais e simulação

Os indicadores da faixa e os estudos de caso profissionais se baseiam no currículo. Os números e o histórico no notebook são dados demonstrativos. O Test Lab usa a Restful Booker em um painel separado.

## Test Lab

Na página inicial em `/pt` ou `/en`, use o botão **Explorar Test Lab** para rolar até o laboratório e executar testes na mesma página. Os endereços diretos `/pt/test-lab` e `/en/test-lab` continuam disponíveis.

- **Autenticação** — login e logout demonstrativos e cinco cenários automatizados. Use as credenciais fictícias exibidas na tela.
- **API** — dez cenários que fazem requisições reais à [Restful Booker](https://restful-booker.herokuapp.com/apidoc/index.html). O inspector mostra requisições, respostas permitidas, duração e asserções Zod.
- **Investigação de defeitos** — três demonstrações isoladas de regras de negócio, com entrada de controle, evidência e relatório.
- **Histórico** — até 20 execuções na sessão da guia, inclusive ao alternar o idioma. Senhas e tokens ficam fora dos resultados.

O Route Handler `POST /api/test-lab` aceita apenas o ID de um cenário fixo. As rotas externas são `GET /ping`, `POST /auth`, `GET/POST /booking` e `GET/PUT/PATCH/DELETE /booking/{id}`. Os pedidos têm timeout e limites de tamanho. O servidor limita execuções por instância e serializa escrita na instância. Deploys com várias réplicas precisam de limitação compartilhada para um limite global.

Para habilitar cenários de escrita, copie `.env.example` para `.env.local` e configure `BOOKER_USERNAME` e `BOOKER_PASSWORD` com as credenciais de demonstração válidas da Restful Booker. Reinicie o servidor. Reservas têm marcadores exclusivos e as operações consultam a propriedade no servidor antes de escrever. O ambiente público pode reiniciar ou alterar dados durante um teste e a limpeza depende de disponibilidade e autenticação do serviço.

Com o servidor em execução:

```bash
npm run typecheck
npm run lint
npm run test:e2e
npm run test:runner
npm run test:booker
npm run test:booker -- --write
```

Cypress usa respostas controladas para testar a interface. O comando `test:booker` separa os testes HTTP reais. Use `LAB_BASE_URL` ou `-- --config baseUrl=...` no Cypress para indicar outra porta. A opção `--write` cria dados fictícios no ambiente público e tenta removê-los. O comando retorna falha se qualquer execução registrar divergência ou erro técnico.
