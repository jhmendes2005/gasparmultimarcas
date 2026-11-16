# Gaspar Multimarcas

Site da Gaspar Multimarcas com identidade vermelha, catálogo de veículos e painel de administração. A foto principal é ilustrativa (Unsplash).

## Executar

Requer Node.js 22.9 ou superior (validado com Node.js 24).

```powershell
npm install
npm run dev
```

Site: http://127.0.0.1:4173 · Painel: http://127.0.0.1:4173/admin

Na primeira execução local, uma senha aleatória é criada em `.data/admin-password.txt`. Abra o arquivo localmente para entrar. Alternativamente, copie `.env.example` para `.env` e configure `ADMIN_PASSWORD` com pelo menos 12 caracteres. O arquivo `.env` e a pasta `.data` são ignorados pelo Git. Nunca publique esses arquivos.

## O que funciona

- Páginas individuais: `/`, `/estoque`, `/veiculo/:id`, `/sobre`, `/contato`, `/comparar`, `/encontre-seu-carro` e `/privacidade`.
- Catálogo com busca, filtros, ordenação, detalhes e galeria em página própria.
- Filtros preservados na URL, seleção de comparação entre páginas, títulos individuais e página 404.
- Favoritos no navegador e comparação de até três veículos.
- Sugestões por orçamento, câmbio e perfil de uso.
- Contato pelo WhatsApp com o veículo selecionado e sorteio entre os três números da loja a cada clique nos botões gerais.
- Os três números ficam visíveis; links de um número específico abrem diretamente aquele contato.
- Painel autenticado para cadastrar, editar e remover veículos.
- Upload múltiplo de JPG, PNG e WebP (8 MB/foto, até 20 fotos), ordenação e escolha da capa.
- Persistência de veículos, configurações e sessões administrativas em PostgreSQL / Neon quando `DATABASE_URL` está configurada.
- Modo de desenvolvimento sem banco com `.data/database.json` e gravação atômica.
- Fotos em `.data/uploads` por padrão; bucket S3/R2 opcional.
- Google Tag Manager e Meta Pixel configuráveis no painel, carregados após consentimento. Revogação em Privacidade.

## PostgreSQL / Neon

Configure `DATABASE_URL` no `.env` local ou no gerenciador de segredos da hospedagem. A conexão usa TLS com verificação de certificado e hostname. Nunca coloque a URL em variáveis públicas do frontend.

```powershell
npm run db:migrate
npm run dev
```

A migração cria apenas o schema `gaspar_site`: tabelas de veículos, configurações, sessões e controle de migrações. Usa transação e trava para evitar duas importações simultâneas. Na primeira execução importa os dados de `.data/database.json`, se existir; caso contrário, importa o catálogo inicial. Não modifica outros schemas. Execuções posteriores não sobrescrevem configurações nem recriam anúncios removidos.

Com banco configurado, o site consulta o PostgreSQL em cada solicitação: alterações feitas em outra instância são visíveis sem reinício. Os tokens de sessão são armazenados com hash SHA-256 e expiração. Sem `DATABASE_URL`, apenas o modo de desenvolvimento usa JSON local; suas sessões ficam em memória.

## Bucket Neon Object Storage / S3 / Cloudflare R2

A Neon oferece [Object Storage compatível com S3](https://neon.com/docs/storage/overview). A senha PostgreSQL não autentica o bucket. Para a integração atual, crie no painel Neon um bucket com acesso `public_read` (fotos públicas dos anúncios) e obtenha as [credenciais de storage](https://neon.com/docs/storage/authentication).

Mapeamento para o projeto:

- `S3_BUCKET`: nome do bucket.
- `S3_ENDPOINT`: endpoint de storage da branch (`AWS_ENDPOINT_URL_S3`).
- `S3_ACCESS_KEY_ID`: `token_id` da credencial de storage.
- `S3_SECRET_ACCESS_KEY`: `s3_secret_access_key`.
- `S3_REGION=us-east-2` e `S3_FORCE_PATH_STYLE=true`, conforme a documentação Neon.
- `S3_PUBLIC_URL`: endpoint de storage seguido de `/nome-do-bucket` (ou CDN pública equivalente).

O projeto não cria automaticamente o bucket e não transforma a URL PostgreSQL em credencial de arquivos. A integração de bucket só é ativada quando as variáveis de storage estão completas.

Para outros provedores, instale as dependências e preencha no `.env`: `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`. Para R2, configure `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com` e `S3_REGION=auto`. Para Amazon S3, configure a região do bucket; o endpoint pode ficar vazio. Em outros provedores, ajuste `S3_ENDPOINT` e `S3_FORCE_PATH_STYLE`.

`S3_PUBLIC_URL` deve ser a URL HTTPS pública ou o domínio CDN do bucket. As fotos precisam ser publicamente legíveis por essa origem; os endpoints de escrita permanecem autenticados. Conceda à chave somente a permissão necessária de `PutObject` no prefixo `vehicles/`. Os envios passam pelo servidor; não é necessário liberar CORS de upload no bucket. As credenciais não chegam ao navegador.

Reinicie o servidor após configurar. O painel indicará `S3 compatível`. Novas fotos irão ao bucket; fotos locais anteriores continuam dependentes do volume de dados. A conexão real com S3/R2 depende de credenciais e não foi validada contra um bucket remoto.

## GTM e Meta Pixel

No painel, abra **Integrações e pixels**, informe `GTM-...` e/ou o ID numérico do Meta Pixel e salve. Sem IDs, nenhum rastreador é carregado. Com IDs configurados, o visitante escolhe aceitar ou recusar. Não configure o mesmo pixel simultaneamente no GTM e no campo Meta para evitar PageViews duplicados.

Eventos do dataLayer: `search_inventory`, `view_vehicle`, `compare_vehicles`, `generate_lead`. Configure tags e gatilhos no seu container GTM. A integração direta do Meta dispara `PageView`; conversões adicionais podem ser configuradas via GTM. Não são enviados nome ou telefone do cliente por esses eventos.

## Produção

Este projeto tem backend Node.js: **publicar somente a pasta dist não publica o painel nem a API**. O catálogo depende da API. Configure `DATABASE_URL`, execute a migração e use um bucket de imagens para hospedar sem depender de arquivos locais. O deploy Vercel ainda precisa de um adaptador para as rotas deste backend; o `vercel.json` da raiz continua apontando para a aplicação anterior.

Use HTTPS, `NODE_ENV=production`, `HOST=0.0.0.0`, `ADMIN_PASSWORD` forte e `APP_ORIGIN=https://seu-dominio`. Produção exige senha configurada e usa cookies Secure. Em produção, `DATABASE_URL` é obrigatória. Veículos, configurações e sessões ficam no PostgreSQL; sessões expiram em 8 horas e podem ser utilizadas entre instâncias. Há um único administrador. Se houver fotos locais antigas, mantenha `DATA_DIR` em volume persistente até migrar essas fotos para o bucket. O limitador de tentativas de login ainda é por processo; em múltiplas instâncias, complemente com limitação no proxy de entrada.

Remover um veículo não apaga os arquivos do bucket/disco para não quebrar fotos reutilizadas. Fotos enviadas em cadastros cancelados também são mantidas; configure rotina de limpeza de arquivos órfãos antes de uso intensivo. Credenciais, bucket, domínio, hospedagem e IDs de rastreamento não são provisionados automaticamente.

## Validação

```powershell
npm run check
npm test
```

Os testes usam diretório temporário e servidor separado. Exercitam autenticação, permissões, upload, criação/edição/remoção, validação de tags, proteção de origem e persistência após reinício.

### Teste real de PostgreSQL

```powershell
$env:RUN_NEON_TESTS='1'
node --env-file=.env --test tests/postgres.test.mjs
```

Cria um schema temporário `gaspar_site_test_*`, testa migração, CRUD, sessões entre duas instâncias, TLS e idempotência, e remove somente o schema dessa execução. O catálogo da loja não é alterado pelo teste.
