# Engineering Dark — Neemias Sales QA Portfolio

Portfólio bilíngue de Quality Assurance baseado no currículo profissional de Neemias Sales.

## Stack
- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS 3
- lucide-react

## Executar localmente

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

Abra http://localhost:3000 (redireciona para `/pt`). A versão inglesa está em `/en`.

## Verificar e publicar

```bash
npm run lint
npm run build
npm start
```

Importe o repositório na Vercel para publicação, após revisar o conteúdo e validar o build.

## Estrutura
- `app/[locale]/page.tsx`: página principal com seções responsivas
- `lib/content.ts`: textos e dados em português e inglês
- `app/globals.css`: estilos base
- `tailwind.config.ts`: cores e tokens visuais

## Escopo da V1
Página inicial, resultados profissionais históricos, projetos, trajetória, stack, contatos e alternância PT/EN por URL. A seção Test Lab está identificada como futura; não há dashboard ao vivo ou testes reais integrados nesta fase.

## Privacidade e precisão
As métricas profissionais são históricas e baseadas no currículo, não em resultados de pipeline ao vivo. Não publique código ou dados internos de empregadores sem autorização.
