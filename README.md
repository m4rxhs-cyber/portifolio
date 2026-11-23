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
# Test Lab — autenticação demonstrativa

O módulo Autenticação usa `POST /api/test-lab/auth/login`, `GET /api/test-lab/auth/session` e `POST /api/test-lab/auth/logout`. As contas `demo@example.test` e `locked@example.test` e a senha `demo-password` são fictícias. O navegador conserva o token apenas durante a execução. A API guarda somente o hash do token (como nome do arquivo) e o horário de expiração, revoga a sessão no logout e rejeita tokens expirados após dois minutos.

Em desenvolvimento e em uma única instância Node.js, o armazenamento padrão é um subdiretório privado no diretório temporário. Em produção, configure `LAB_AUTH_SESSION_DIR` com um caminho gravável e privado. Instâncias diferentes precisam compartilhar esse diretório para que login, autorização e logout vejam o mesmo estado. Um diretório temporário isolado por instância não é suficiente em hospedagem serverless distribuída. A implantação precisa preservar a origem pública na requisição encaminhada e usar HTTPS. O limite de 180 requisições por minuto e 12 simultâneas é por processo. Para um limite global em múltiplas instâncias, configure a proteção na camada de entrada da hospedagem.

`npm run test:runner` cobre os cenários da API demonstrativa, o isolamento, a expiração e os erros do executor.

## Test Lab — API Testing

A API usa o prefixo `/api/test-lab/rest`. `POST /workspace` cria um ambiente isolado e `DELETE /workspace` o remove. As demais operações usam `X-Demo-Workspace`, emitido pelo servidor e mantido apenas em memória no navegador.

| Caminho | Métodos |
| --- | --- |
| `/customers` | GET, POST |
| `/customers/:id` | GET, PUT, PATCH, DELETE |
| `/orders` | GET, POST |
| `/orders/:id` | GET |

Cada cenário abre e remove seu próprio ambiente. O Request Builder reutiliza um ambiente durante a visita, oferece limpeza explícita e mantém até oito respostas na memória da página. O acesso expira 15 minutos após a criação. A remoção de arquivos expirados ocorre na abertura de novos ambientes. Use somente dados fictícios.

Configure `LAB_REST_WORKSPACE_DIR` com um caminho gravável e privado na hospedagem Node.js. Múltiplos processos precisam compartilhar um volume com criação exclusiva de arquivos e renomeação atômica. Armazenamento temporário local não garante consistência em plataformas serverless distribuídas. O limite de 240 requisições por minuto e 12 simultâneas é por processo. Em produção, configure limites distribuídos na camada de entrada, preserve a origem pública nas requisições encaminhadas e use HTTPS. O dispatcher não realiza requisições de saída.
