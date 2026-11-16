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
- Busca global com sugestões instantâneas; Enter abre o estoque com o termo na URL.
- Filtros na URL, favoritos e comparação entre páginas.
- Três contatos no cabeçalho e rodapé com canais, endereço e horários organizados.
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

## Importação WooCommerce

No painel `/admin`, abra **Importar WooCommerce** e selecione a exportação CSV de produtos em UTF-8 (vírgula ou ponto e vírgula). Limite: 1 MB / 500 produtos / 20 fotos por veículo / 8 MB por foto.

O importador usa apenas marca, modelo, versão, ano do modelo, preço regular, quilometragem, câmbio, combustível, categoria, descrição e fotos. Descrições HTML viram texto. SKU, cores, portas, impostos, frete e metadados do WordPress não entram no catálogo. Categorias são sugeridas pelo modelo; confira-as na revisão. Preços promocionais são ignorados.

Revise os avisos e edite os dados antes de iniciar. Produtos não publicados, sem estoque ou de tipo diferente de `simple` não podem ser importados. Campos ausentes ou ambíguos precisam ser corrigidos. Anúncios existentes são reconhecidos por vínculo do ID WooCommerce ou por marca/modelo/ano/KM exatos e únicos. Eles começam desmarcados; selecioná-los atualiza o cadastro e substitui suas fotos. Não há exclusão automática de veículos ausentes no CSV.

As imagens do CSV **nunca são usadas como URLs públicas do anúncio**, nem como miniaturas na revisão. O servidor baixa apenas arquivos HTTPS da pasta `/wp-content/uploads/` dos domínios `gasparmultimarcas.com.br` e `www.gasparmultimarcas.com.br`, valida o conteúdo e copia para Vercel Blob. Cada chamada processa uma foto; o anúncio é salvo somente após todas as fotos serem copiadas. Realize a importação enquanto o WordPress ainda atende nesse domínio. Após apontar o domínio para a Vercel, fotos ainda não copiadas não estarão mais disponíveis nesse endereço.

Jobs, progresso, cache das fotos copiadas e vínculos WooCommerce ficam em tabelas privadas do Neon (`import_jobs`, `import_images`, `import_links`), acessíveis apenas por endpoints autenticados. Atualize o banco com `npm run db:migrate` antes de publicar esta versão. Fechar o painel interrompe o processamento; volte à aba e clique em **Retomar importação**. Erros preservam as fotos já copiadas e o anúncio anterior. Reimportar o mesmo ID atualiza o veículo vinculado, evitando duplicatas.

## GTM e Meta Pixel

No painel, abra **Integrações e pixels** e informe `GTM-...` e/ou o ID numérico do Meta Pixel. Sem IDs, nenhum rastreador é carregado. O visitante pode aceitar, recusar ou revogar o consentimento.

Eventos do dataLayer: `search_inventory`, `view_vehicle`, `compare_vehicles` e `generate_lead`. Configure as tags correspondentes no GTM. A integração direta do Meta dispara `PageView`. Evite configurar o mesmo pixel nos dois lugares.

## Relatório de WhatsApp

Em `/admin`, a aba **Leads e WhatsApp** mostra total de cliques, quantidade e participação de cada um dos três números, origem do botão, veículos de interesse e os 50 registros mais recentes do período. Há atalhos para hoje, sete dias, trinta dias e todo o histórico, além de intervalo personalizado. Datas e agrupamentos usam `America/Sao_Paulo`.

Todos os links passam pelo redirecionamento `/whatsapp` antes de abrir `wa.me`. O JavaScript mantém o sorteio e a mensagem do veículo, acrescentando um UUID por clique. O destino é limitado aos números da loja. Links estáticos também passam pelo redirecionamento quando JavaScript não estiver disponível; nesse caso os botões de sorteio usam seu destinatário padrão. O banco deduplica tentativas com o mesmo UUID. Requisições HEAD, pré-carregamentos, robôs identificáveis e sub-recursos não entram na contagem. Se a gravação falhar, o redirecionamento para o atendimento continua.

Os registros persistem na tabela privada `whatsapp_clicks` do Neon. O relatório exige a sessão administrativa. A tabela guarda apenas identificador do evento, data/hora, número comercial escolhido, posição do botão, página e identificação/nome do veículo; não guarda mensagem, nome, telefone ou IP do visitante. Execute `npm run db:migrate` antes de publicar a versão.

A contagem começa na ativação desta funcionalidade; cliques anteriores não são reconstruídos. Os dados medem aberturas do WhatsApp e podem incluir mais de um clique da mesma pessoa. Não confirmam o envio de mensagens nem a conversão em vendas.

## Publicação

A aplicação está na raiz do repositório. O projeto Vercel `gasparmultimarcas` está conectado ao GitHub: pushes na `main` publicam produção; outras branches geram previews.

A configuração `vercel.json` publica os arquivos de `dist` e encaminha as rotas dinâmicas ao adaptador `api/index.js`. A função usa PostgreSQL / Neon e Vercel Blob; arquivos temporários ficam em `/tmp`.

Configure `DATABASE_URL`, `ADMIN_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID` e `BLOB_PUBLIC_URL` nas variáveis da Vercel. As três primeiras devem ser segredos. `APP_ORIGIN` é opcional; sem ela, a validação de origem exige o mesmo host da solicitação, permitindo os domínios de preview da própria implantação.

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


## SEO e indexação

As páginas públicas recebem títulos, descrições, canonical, Open Graph e Twitter Cards no servidor. O domínio canônico é `https://gasparmultimarcas.com.br`. O acesso público por `www` redireciona permanentemente para esse domínio; versões `.html` e barras finais também são normalizadas. URLs de preview e ambientes locais não são indexáveis. Comparação, favoritos e filtros de estoque recebem `noindex,follow`, com canonical limpo para evitar variações duplicadas.

O estoque e as fichas dos veículos são entregues no HTML inicial, com o mesmo componente usado pelo navegador. Os dados iniciais públicos são incorporados de forma segura, evitando uma segunda busca do catálogo ao carregar a página. A galeria, os favoritos, os filtros e o rastreamento do WhatsApp continuam disponíveis com JavaScript.

Dados estruturados JSON-LD incluem `AutoDealer`, `WebSite`, páginas, breadcrumbs, lista de estoque e `Car`/`Product` com oferta em BRL, fotos e quilometragem. São usados apenas endereço, contatos, horários e dados cadastrados; não são inventados avaliações, VIN, coordenadas ou prazos de preço. A marcação não garante resultados enriquecidos específicos.

`/sitemap.xml` é gerado a partir do estoque atual e inclui fotos e a data real de atualização registrada no PostgreSQL. Veículos removidos saem do sitemap automaticamente. A versão local omite datas que não existem, em vez de usar a data de cada requisição. `/robots.txt` publica o sitemap e restringe as áreas administrativas e o redirecionamento de atendimento, mantendo CSS, JavaScript e fotos rastreáveis. Páginas inexistentes e veículos removidos retornam 404.

Para acompanhar indexação e pesquisas, cadastre o domínio e envie `https://gasparmultimarcas.com.br/sitemap.xml` no Google Search Console da loja. Verificação da propriedade e envio ao Search Console dependem do acesso à conta do proprietário; não são realizados apenas pelo deploy do site.


## Identidade visual e redes sociais

A camada pública de tipografia, contraste e cores está em `dist/vitality.css`; o painel administrativo mantém seus próprios estilos. Ela amplia os títulos, textos, botões e preços, com ajustes para celular e tablet.

Os perfis oficiais informados pela loja ficam em `dist/social-links.js`. O servidor renderiza Instagram e Facebook no cabeçalho e no rodapé de todas as páginas públicas, além da página de contato. Os mesmos links alimentam o `sameAs` da loja nos dados estruturados. Ícones SVG locais evitam carregar widgets e scripts de redes sociais. Edite esse arquivo para atualizar os destinos.
