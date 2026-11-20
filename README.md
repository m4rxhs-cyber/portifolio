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

Os indicadores da faixa e os estudos de caso profissionais se baseiam no currículo. Os números e o histórico no notebook são dados demonstrativos. O Test Lab interativo e a integração do painel com o GitHub Actions ficam para uma fase futura.
