# Gaspar Multimarcas

Site com páginas individuais, identidade vermelha, catálogo de veículos e painel administrativo. Dados em PostgreSQL / Neon e fotos em Vercel Blob.

## Executar localmente

Requer Node.js 24 ou superior.

```powershell
npm ci
npm run build
npm run dev
```

Site: http://127.0.0.1:4173 · Painel: http://127.0.0.1:4173/admin

Configure o `.env` seguindo `.env.example`. A primeira execução local gera uma senha em `.data/admin-password.txt` se `ADMIN_PASSWORD` não estiver definida. Arquivos de credenciais, dados locais e dependências ficam fora do Git.

## Funcionalidades

- Início, estoque, veículo individual, sobre nós, contato, comparação, seleção por perfil e privacidade.
- Filtros na URL, favoritos e comparação entre páginas.
- Três números de contato visíveis e sorteio de atendente nos botões gerais de WhatsApp.
- Cadastro, edição e remoção manual de veículos, fotos múltiplas, capa e ordenação.
- Google Tag Manager e Meta Pixel configuráveis, carregados após consentimento.
- Veículos, configurações e sessões administrativas persistidos no PostgreSQL.

## PostgreSQL / Neon

Configure `DATABASE_URL` apenas no servidor e execute:

```powershell
npm run db:migrate
```

A migração usa o schema `gaspar_site` e transações. No primeiro uso, importa `.data/database.json` quando existir ou o catálogo inicial. Não modifica outros schemas, não sobrescreve configurações e não recria anúncios removidos em execuções seguintes.

A conexão usa TLS com verificação de certificado e hostname. Sessões expiram em oito horas e são armazenadas com hash do token. Com banco configurado, os dados são consultados a cada solicitação. O modo de desenvolvimento sem `DATABASE_URL` usa JSON local; produção exige PostgreSQL.

## Fotos no Vercel Blob

O armazenamento `gaspar-veiculos` foi criado na região `gru1` (São Paulo), com leitura pública das fotos e escrita autenticada pelo painel.

Variáveis do servidor:

- `BLOB_READ_WRITE_TOKEN`: credencial privada fornecida pela conexão do Blob.
- `BLOB_STORE_ID`: identificador do armazenamento (opcional quando inferido do token).
- `BLOB_PUBLIC_URL`: origem pública das fotos (opcional quando inferida do token).

O painel envia as fotos diretamente ao Blob com tokens temporários limitados a imagens JPG, PNG ou WebP, até 8 MB. O servidor confirma domínio, tamanho, tipo e assinatura do arquivo antes de aceitar a foto. Isso evita passar os arquivos pelo corpo de uma função da Vercel. A credencial de escrita não é enviada ao navegador.

Para migrar fotos locais de veículos já cadastrados:

```powershell
npm run images:migrate
```

A migração atualiza os anúncios somente após concluir o envio de suas fotos. Fotos já hospedadas não são reenviadas. O arquivo de cada imagem local é preservado. A imagem ilustrativa da página inicial e a logo continuam como recursos estáticos do site.

S3 compatível continua disponível como alternativa pelas variáveis `S3_*`. Com `BLOB_READ_WRITE_TOKEN` configurado, Vercel Blob tem prioridade. Sem armazenamento externo, apenas o desenvolvimento usa arquivos locais.

Remover um anúncio não apaga suas fotos do armazenamento para evitar quebrar imagens reutilizadas. Cadastros cancelados também podem deixar arquivos órfãos; a limpeza desses arquivos deve ser tratada separadamente.

## GTM e Meta Pixel

No painel, abra **Integrações e pixels** e informe `GTM-...` e/ou o ID numérico do Meta Pixel. Sem IDs, nenhum rastreador é carregado. O visitante pode aceitar, recusar ou revogar o consentimento.

Eventos do dataLayer: `search_inventory`, `view_vehicle`, `compare_vehicles` e `generate_lead`. Configure as tags correspondentes no GTM. A integração direta do Meta dispara `PageView`. Evite configurar o mesmo pixel nos dois lugares.

## Publicação

A aplicação está na raiz do repositório. A publicação na Vercel ainda não foi executada. O projeto Vercel `gasparmultimarcas` e seu Blob foram criados; o próximo passo de deploy precisa configurar as rotas do backend Node, `DATABASE_URL`, `ADMIN_PASSWORD` e `APP_ORIGIN` no ambiente hospedado.

Produção deve usar HTTPS, `NODE_ENV=production` e senha administrativa forte. As sessões e os anúncios podem ser compartilhados entre instâncias pelo PostgreSQL; o limitador de tentativas de login ainda é por processo e deve ser complementado na entrada da aplicação em uma implantação distribuída.

## Validação

```powershell
npm run check
npm test
```

Os testes padrão usam diretórios temporários e servidores separados. Para testar os serviços reais com as credenciais do `.env`:

```powershell
$env:RUN_NEON_TESTS='1'
node --env-file=.env --test tests/postgres.test.mjs
$env:RUN_BLOB_TESTS='1'
node --env-file=.env --test tests/image-storage.test.mjs
```

O teste PostgreSQL cria e remove somente um schema temporário próprio. O teste Blob envia, lê, valida e remove apenas a foto criada pela própria execução.
