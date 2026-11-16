# Gaspar Multimarcas

Redesign independente baseado no site público https://gasparmultimarcas.com.br/. Fotos e informações dos seis anúncios foram consultadas em 16/11/2026; confirmar disponibilidade e preço com a loja. A foto principal é ilustrativa (Unsplash). A identidade usa vermelho e a logo original, extraída diretamente de https://gasparmultimarcas.com.br/wp-content/uploads/2024/11/Design-sem-nome-1.png, sem redesenho ou alteração do arquivo.

## Executar

Requer Node.js 22.9 ou superior (validado com Node.js 24).

```powershell
npm install
npm run dev
```

Site: http://127.0.0.1:4173 · Painel: http://127.0.0.1:4173/admin

Na primeira execução local, uma senha aleatória é criada em `.data/admin-password.txt`. Abra o arquivo localmente para entrar. Alternativamente, copie `.env.example` para `.env` e configure `ADMIN_PASSWORD` com pelo menos 12 caracteres. O arquivo `.env` e a pasta `.data` são ignorados pelo Git. Nunca publique esses arquivos.

## O que funciona

- Catálogo com busca, filtros, ordenação, detalhes e galeria.
- Favoritos no navegador e comparação de até três veículos.
- Sugestões por orçamento, câmbio e perfil de uso.
- Contato pelo WhatsApp com o veículo selecionado.
- Painel autenticado para cadastrar, editar e remover veículos.
- Upload múltiplo de JPG, PNG e WebP (8 MB/foto, até 20 fotos), ordenação e escolha da capa.
- Persistência de veículos e configurações em `.data/database.json` com gravação atômica.
- Fotos em `.data/uploads` por padrão; bucket S3/R2 opcional.
- Google Tag Manager e Meta Pixel configuráveis no painel, carregados após consentimento. Revogação em Privacidade.

## Bucket S3 / Cloudflare R2

Instale as dependências e preencha no `.env`: `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`. Para R2, configure `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com` e `S3_REGION=auto`. Para Amazon S3, configure a região do bucket; o endpoint pode ficar vazio. Em outros provedores, ajuste `S3_ENDPOINT` e `S3_FORCE_PATH_STYLE`.

`S3_PUBLIC_URL` deve ser a URL HTTPS pública ou o domínio CDN do bucket. As fotos precisam ser publicamente legíveis por essa origem; os endpoints de escrita permanecem autenticados. Conceda à chave somente a permissão necessária de `PutObject` no prefixo `vehicles/`. Os envios passam pelo servidor; não é necessário liberar CORS de upload no bucket. As credenciais não chegam ao navegador.

Reinicie o servidor após configurar. O painel indicará `S3/R2`. Novas fotos irão ao bucket; fotos locais anteriores continuam dependentes do volume de dados. A conexão real com S3/R2 depende de credenciais e não foi validada contra um bucket remoto.

## GTM e Meta Pixel

No painel, abra **Integrações e pixels**, informe `GTM-...` e/ou o ID numérico do Meta Pixel e salve. Sem IDs, nenhum rastreador é carregado. Com IDs configurados, o visitante escolhe aceitar ou recusar. Não configure o mesmo pixel simultaneamente no GTM e no campo Meta para evitar PageViews duplicados.

Eventos do dataLayer: `search_inventory`, `view_vehicle`, `compare_vehicles`, `generate_lead`. Configure tags e gatilhos no seu container GTM. A integração direta do Meta dispara `PageView`; conversões adicionais podem ser configuradas via GTM. Não são enviados nome ou telefone do cliente por esses eventos.

## Produção

Este projeto tem backend Node.js: **publicar somente a pasta dist não publica o painel nem a API**. O catálogo estático é uma amostra dos seis veículos originais. Hospede o servidor em serviço Node/container com disco persistente, ou adapte persistência para banco gerenciado antes de usar múltiplas instâncias.

Use HTTPS, `NODE_ENV=production`, `HOST=0.0.0.0`, `ADMIN_PASSWORD` forte e `APP_ORIGIN=https://seu-dominio`. Produção exige senha configurada e usa cookies Secure. Mantenha o diretório `DATA_DIR` em volume persistente com backups. Há um único administrador; sessões são mantidas em memória e expiram em 8 horas ou ao reiniciar. A persistência JSON atende uma instância. Para múltiplas instâncias, migre dados e sessões para banco compartilhado.

Remover um veículo não apaga os arquivos do bucket/disco para não quebrar fotos reutilizadas. Fotos enviadas em cadastros cancelados também são mantidas; configure rotina de limpeza de arquivos órfãos antes de uso intensivo. Credenciais, bucket, domínio, hospedagem e IDs de rastreamento não são provisionados automaticamente.

## Validação

```powershell
npm run check
npm test
```

Os testes usam diretório temporário e servidor separado. Exercitam autenticação, permissões, upload, criação/edição/remoção, validação de tags, proteção de origem e persistência após reinício.
