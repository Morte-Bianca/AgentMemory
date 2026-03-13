# Vercel (Web UI) ile Deploy Rehberi

Bu repo Vercel Functions (Node.js) üzerinde çalışacak şekilde hazırlanmıştır:

- Handler: `api/index.ts`
- Rewrite: `vercel.json` ile tüm path'ler `/api/index`'e yönlenir (yani mevcut `/v1/*` ve `/health` path'leri korunur).

## 1) Repo'yu Vercel'e import et

1. Vercel Dashboard → **Add New…** → **Project**
2. GitHub hesabını bağla (gerekirse)
3. `AgentMemory` repo'sunu seç → **Import**

## 2) Build ayarları

Vercel genelde otomatik algılar:

- Framework Preset: **Other** (veya Node)
- Install Command: `npm ci` (Vercel default'u)
- Build Command: `npm run build`
- Output Directory: boş / yok

## 3) Environment Variables

Vercel Dashboard → Project → **Settings** → **Environment Variables**

### Minimum (public test, auth kapalı)

- `TEST_MODE` = `true`

Storage için iki seçenek:

A) **Hızlı test (ephemeral)**
- `STORAGE_DRIVER` = `file`
- `DATA_FILE_PATH` = `/tmp/store.json`

> Not: Vercel Functions ephemeral çalışır; dosya sistemi kalıcı değildir.
> Bu modda memory/session verileri deploy/scale/restart ile kaybolabilir.

B) **Kalıcı test (önerilen)**
- `STORAGE_DRIVER` = `postgres`
- `DATABASE_URL` = `postgres://...` (opsiyonel)

> Not: Vercel Postgres entegrasyonu kullanıyorsan genelde `POSTGRES_URL` / `POSTGRES_PRISMA_URL` otomatik gelir.
> Bu repo `DATABASE_URL` yoksa bu env'leri otomatik kullanır.

Vercel Postgres'ı UI üzerinden bağlamak için:

1. Vercel Dashboard → Project → **Storage**
2. **Create Database** → **Postgres**
3. DB'yi projeye bağla (Vercel env'leri otomatik ekler)
4. Projede yalnızca `STORAGE_DRIVER=postgres` set etmen genelde yeterli olur

MCP tarafı için (browser/remote client testlerinde):
- `MCP_ALLOWED_ORIGINS` = `*` (sadece test için)
- `MCP_SESSION_EVENT_LIMIT` = `100`
- `MCP_SESSION_TTL_MS` = `86400000`

## 4) Deploy

- **Deploy** butonuna bas.
- Deploy tamamlanınca Vercel sana bir URL verir.

Kontrol:

- `GET https://<project>.vercel.app/health`
- `POST https://<project>.vercel.app/v1/agents` (public modda API key olmadan da çalışır)
- `POST https://<project>.vercel.app/v1/mcp`

## 5) Claw client için URL

Claw client/MCP client konfig'inde base URL olarak Vercel URL'yi kullan:

- `https://<project>.vercel.app`

MCP endpoint:

- `POST https://<project>.vercel.app/v1/mcp`
- `GET https://<project>.vercel.app/v1/mcp`

## 6) Önemli notlar

- Public test modunda herkes aynı shared agent üstünden yazar/okur.
- Gerçek kullanım için `TEST_MODE=false` ve **mutlaka** `STORAGE_DRIVER=postgres` önerilir.
- SSE cevapları (MCP) kısa-lived olduğu için Vercel'de genelde sorunsuzdur; yine de bazı client'larda proxy/edge davranışları nedeniyle `Accept: application/json` ile devam etmek daha stabil olabilir.
