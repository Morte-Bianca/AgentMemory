# Claw Memory API

Claw agentlara odaklı, HTTP tabanlı bir memory ve dream servisi.

English external tester guide:

- [README-TESTERS.md](README-TESTERS.md)

## MVP kapsamı

- agent kaydı
- API key tabanlı agent auth
- session oluşturma
- memory store
- scoped recall
- dream cycle çalıştırma
- dream schedule başlatma/durdurma
- Claw event ingestion
- Claw context üretimi
- seçilebilir storage driver (`file` / `postgres`)

## Tasarım

İlk sürümde servis şu prensiplerle kuruldu:

- sadece Claw-agent kullanımına odaklı API yüzeyi
- `episodic`, `semantic`, `procedural`, `self_model`, `introspective` memory tipleri
- deterministic recall skorlama
- local embedding üretimi + hybrid recall
- Claw-only dream provider abstraction
- provider destekli dream synthesis
- route seviyesinde API key doğrulama
- Claw event → memory dönüşümü
- storage abstraction + Postgres adaptörü
- LLM/provider bağımsız çekirdek servis katmanı

## Endpoint'ler

- `GET /health`
- `GET /v1/agents`
- `GET /v1/agents/me`
- `POST /v1/agents`
- `POST /v1/agents/me/api-key/rotate`
- `POST /v1/agents/me/api-key/revoke`
- `POST /v1/sessions`
- `GET /v1/agents/:agentId/sessions`
- `POST /v1/memories`
- `POST /v1/memories/recall`
- `GET /v1/agents/:agentId/memories`
- `GET /v1/agents/:agentId/memories/stats`
- `POST /v1/dreams/run`
- `GET /v1/agents/:agentId/dreams`
- `POST /v1/dreams/schedule/start`
- `POST /v1/dreams/schedule/stop`
- `GET /v1/dreams/schedule`
- `POST /v1/claw/events`
- `POST /v1/claw/context`
- `POST /v1/mcp`

## Auth

`POST /v1/agents` çağrısı yeni bir agent ve tek-seferlik gösterilen bir `apiKey` döner.

Korunan endpoint'lerde şu header'lardan biri gerekir:

- `Authorization: Bearer <apiKey>`
- `x-api-key: <apiKey>`

API key lifecycle endpoint'leri:

- `POST /v1/agents/me/api-key/rotate`
- `POST /v1/agents/me/api-key/revoke`

Rotation sonrası eski key anında geçersiz olur.
Revoke sonrası mevcut key de geçersiz olur.

Auth bypass (sadece test için):

- `TEST_MODE=true` ile API key göndermeden de istek atılabilir.
- Bu modda kimliksiz istekler, paylaşımlı bir public agent üzerinden yürür.

## Claw akışı

Önerilen akış:

1. agent oluştur
2. API key sakla
3. Claw event'lerini `POST /v1/claw/events` ile ingest et
4. çalışma anında bağlamı `POST /v1/claw/context` ile çek
5. gerektiğinde manuel veya otomatik dream çalıştır

## Claw event schema

`POST /v1/claw/events` artık daha zengin bir sözleşme kabul eder:

- session alanları: `id`, `channel`, `workspaceId`, `threadId`, `userId`, `metadata`
- event alanları: `kind`, `actor`, `intent`, `action`, `toolName`, `outcome`, `references`, `metadata`

Özellikle `tool_result` event'lerinde explicit tool/action mapping yapılır:

- başarılı tool sonucu → çoğunlukla `procedural`
- başarısız/eksik tool sonucu → `episodic`
- otomatik tag'ler: `tool:*`, `action:*`, `outcome:*`, `actor:*`, `intent:*`

Bu alanlar memory `metadata` içine de yazılır; böylece recall çıktısı Claw workflow bağlamını korur.

`POST /v1/memories/recall` ve `POST /v1/claw/context` çağrılarında opsiyonel `metadataFilters` da kullanılabilir:

- `actor`
- `intent`
- `action`
- `toolName`
- `outcome`
- `workspaceId`
- `threadId`
- `userId`

Bu filtreler recall havuzunu daraltır; özellikle Claw tool akışlarında belirli workflow izlerini çağırmak için kullanılır.

## Storage

Servis artık iki storage driver ile çalışır:

- `file` → yerel geliştirme için JSON store
- `postgres` → kalıcı backend için PostgreSQL

Environment örneği: [.env.example](.env.example)

### File mode

```bash
STORAGE_DRIVER=file
DATA_FILE_PATH=./data/store.json
```

### Postgres mode

```bash
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/agentmemory
```

Vercel Postgres kullanıyorsan genelde `POSTGRES_URL` / `POSTGRES_PRISMA_URL` otomatik gelir; `DATABASE_URL` set etmeden de çalışır.

İlk başlangıçta tablo şeması otomatik oluşturulur.

Postgres modunda embedding saklama ve (opsiyonel) vector search desteği vardır:

- Her zaman: `memories.embedding` (TEXT) ve `memories.embedding_model`
- `pgvector` varsa: `embedding_vector` (vector) kolonu + (best-effort) HNSW index
- Vector search yoksa: recall sorgusu metadata/text/tag üzerinden degrade eder (sistem çalışmaya devam eder).

Elle incelemek için SQL dosyası:

- [sql/postgres-schema.sql](sql/postgres-schema.sql)

## Embeddings

Servis şu an dış provider gerektirmeyen yerel bir embedding sağlayıcısı ile gelir.

- model adı: `local-hash-128`
- boyut: `EMBEDDING_DIMENSIONS` ile ayarlanabilir
- store sırasında embedding üretilir
- file mode'da recall sırasında keyword + tag + importance + recency + vector similarity birlikte skorlanır
- file mode'da `metadataFilters` eşleşmeleri de reranking skoruna katılır
- postgres mode'da SQL tarafında vector top-k adayları ile metadata/text/tag adayları birlikte toplanır, sonra hybrid reranking uygulanır

Bu sayede sonraki fazda Claw-native veya self-hosted embedding backends eklenmeden önce hybrid recall hattı hazır olur.

## Dream synthesis

Dream hattı artık provider abstraction üzerinden çalışır.

- config: `DREAM_PROVIDER=local`
- aktif provider: `local-claw-dream-v1`
- kaynak: episodic + introspective memory'ler
- çıktı: `semantic`, `procedural`, `self_model` draft'ları

Bu katman Claw odaklı tutuldu. Dış OpenAI entegrasyonu yok.

Şu anki provider yerel ve deterministic çalışır, ancak `DreamSynthesisProvider` arayüzü sayesinde ileride Claw'a özel başka synthesis backend'leri eklenebilir.

## MCP bridge

Servis artık streamable HTTP uyumlu bir MCP bridge de sunar:

- endpoint'ler: `GET /v1/mcp`, `POST /v1/mcp`, `DELETE /v1/mcp`
- auth: standart API key header'ları
- transport: JSON-RPC 2.0 + `text/event-stream`
- session: `initialize` cevabında `Mcp-Session-Id` header'ı döner; sonraki isteklerde bu header geri gönderilir
- güvenlik: `Origin` header'ı varsa allowlist ile doğrulanır

Desteklenen method'lar:

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`

Transport davranışı:

- JSON response isteyen istemciler için standart `application/json`
- `Accept: text/event-stream` gönderildiğinde SSE stream response
- `GET /v1/mcp` ile discovery/endpoint SSE event'i
- `DELETE /v1/mcp` ile session kapatma
- `Last-Event-ID` ile queued SSE message replay
- session içinde oluşan arka plan bildirimleri GET stream üzerinden tekrar alınabilir
- MCP session state storage driver içinde kalıcı tutulur; process restart sonrası session ve queued event'ler korunur
- session'lar TTL ile temizlenir; süresi dolan session'lar otomatik olarak kullanılamaz hale gelir

Bridge şu tool'ları expose eder:

- `memory_store`
- `memory_recall`
- `claw_context_build`
- `dream_run`

Bu sayede MCP uyumlu istemciler aynı auth modeliyle memory store/recall, context üretimi ve dream tetikleme işlemlerini tek endpoint üzerinden çağırabilir.
Şu an server tarafı şu arka plan notification'larını kuyruklar ve replay edebilir:

- `notifications/claw/memory_stored`
- `notifications/claw/dream_completed`

Queue session başına son mesajları tutar ve seçilen storage driver içinde saklanır; `file` modunda JSON store'a, `postgres` modunda `mcp_sessions` tablosuna yazılır.

İlgili config alanları:

- `MCP_SESSION_EVENT_LIMIT`
- `MCP_SESSION_TTL_MS`
- `MCP_ALLOWED_ORIGINS`

## Geliştirme

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Docker (public test)

Docker ile public (geçici) deploy için: [docs/docker-public-deploy.md](docs/docker-public-deploy.md)

## Vercel (public test)

Vercel web arayüzü ile deploy için: [docs/vercel-deploy.md](docs/vercel-deploy.md)

## Test

```bash
npm test
```

Gerçek Claw client ile uçtan uca doğrulama için ayrıntılı rehber:

- [docs/real-claw-e2e-integration.md](docs/real-claw-e2e-integration.md)

## Sonraki adımlar

- Claw-native embedding backend desteği
- daha gelişmiş Claw-native dream provider
- gerçek Claw client ile uçtan uca entegrasyon testi
