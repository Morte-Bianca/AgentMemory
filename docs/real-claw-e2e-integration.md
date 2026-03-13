# Gerçek Claw Client ile Uçtan Uca Entegrasyon Testi Rehberi

Bu belge, gerçek bir Claw client kullanarak bu servisin uçtan uca doğrulanması için gerekli adımları açıklar.

Amaç:

- gerçek Claw runtime ile MCP handshake doğrulamak
- tool discovery akışını doğrulamak
- memory store / recall / context üretimini gerçek istemci üzerinden doğrulamak
- dream akışını gerçek istemci üzerinden tetiklemek
- SSE, replay, session persistence ve TTL davranışını sahada doğrulamak

Bu rehber, mevcut servis implementasyonuna dayanır:

- MCP endpoint: [src/routes/mcp.ts](../src/routes/mcp.ts)
- Claw route'ları: [src/routes/claw.ts](../src/routes/claw.ts)
- Memory route'ları: [src/routes/memories.ts](../src/routes/memories.ts)
- Dream route'ları: [src/routes/dreams.ts](../src/routes/dreams.ts)
- Konfigürasyon: [src/config.ts](../src/config.ts)
- Ortam örneği: [.env.example](../.env.example)

## 1. Testin hedefi

Gerçek entegrasyon testinde cevaplanması gereken ana sorular:

1. Claw client, `initialize` çağrısını başarıyla yapabiliyor mu?
2. `Mcp-Session-Id` header'ını alıp sonraki isteklerde geri gönderiyor mu?
3. `tools/list` çıktısını doğru parse ediyor mu?
4. `tools/call` ile `memory_store`, `memory_recall`, `claw_context_build`, `dream_run` çağrılarını çalıştırabiliyor mu?
5. `text/event-stream` cevabını doğru okuyabiliyor mu?
6. `GET /v1/mcp` discovery akışını doğru açabiliyor mu?
7. `Last-Event-ID` ile replay davranışı client tarafında doğru çalışıyor mu?
8. Session restart sonrası kalıcı session'ı yeniden kullanabiliyor mu?
9. TTL dolunca client doğru şekilde yeni session başlatıyor mu?
10. `Origin` allowlist kısıtı gerçek client ortamında sorun çıkarmıyor mu?

## 2. Ön koşullar

Aşağıdakiler hazır olmalı:

- çalışan bir Claw Memory API instance
- gerçek Claw client veya Claw runtime
- API'ye erişebilen bir ağ ortamı
- servis için oluşturulmuş bir agent API key

Önerilen yerel ayar:

- host: `127.0.0.1`
- port: `3000`
- storage: önce `file`, sonra `postgres`

## 3. Test ortamı hazırlığı

### 3.1 Servisi yapılandır

En az şu değerleri ayarla:

- `HOST=127.0.0.1`
- `PORT=3000`
- `STORAGE_DRIVER=file`
- `DATA_FILE_PATH=./data/store.json`
- `MCP_SESSION_EVENT_LIMIT=100`
- `MCP_SESSION_TTL_MS=86400000`
- `MCP_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`

Notlar:

- Eğer gerçek Claw client farklı origin ile çalışıyorsa, onu da `MCP_ALLOWED_ORIGINS` listesine ekle.
- İlk testleri `file` driver ile yap. İkinci turda aynı senaryoyu `postgres` ile tekrar et.

### 3.2 Servisi başlat

Önce build ve testin temiz geçtiğini doğrula, ardından servisi çalıştır.

Beklenen durum:

- health endpoint cevap verir
- MCP endpoint erişilebilir olur
- yeni agent oluşturulabilir

### 3.3 Test agent oluştur

`POST /v1/agents` ile ayrı bir test agent üret.

Bu agent için saklanacak veriler:

- `agent.id`
- tek seferlik `apiKey`

Bu key gerçek Claw client konfigürasyonunda kullanılacak.

## 4. Gerçek Claw client konfigürasyonu

Gerçek client tarafında aşağıdakiler netleştirilmeli:

- MCP server URL
- auth header biçimi
- streamable HTTP desteği
- SSE okuyucu desteği
- session header saklama davranışı

Client aşağıdaki sözleşmeyi desteklemeli:

- ilk `initialize` çağrısı `Mcp-Session-Id` olmadan gönderilir
- sunucudan dönen `Mcp-Session-Id` saklanır
- sonraki `POST`, `GET`, `DELETE` çağrılarında aynı header geri gönderilir
- `Accept: application/json, text/event-stream` veya en azından uygun `Accept` header'ı gönderilir

Auth için desteklenen header'lar:

- `Authorization: Bearer <apiKey>`
- `x-api-key: <apiKey>`

### 4.1 Stdio MCP (NanoClaw/SolClaw benzeri) için proxy seçeneği

Bazı Claw türevleri / agent runtime'ları MCP tarafında `stdio` transport (JSON-RPC 2.0 + `Content-Length` framing) bekler.
Bu repo'daki MCP implementasyonu ise HTTP + SSE üzerinden çalışır (`/v1/mcp`).

Bu durumda köprü olarak `stdio MCP ⇄ HTTP MCP proxy` kullanabilirsin:

- Proxy entrypoint: [src/mcp-stdio-proxy.ts](../src/mcp-stdio-proxy.ts)
- Proxy, stdio'dan gelen MCP mesajlarını AgentMemory'nin `/v1/mcp` endpoint'ine forward eder.
- Upstream `Mcp-Session-Id` header'ını proxy kendi içinde saklar; stdio tarafına header yansıtılmaz.
- Her request'ten sonra proxy `GET /v1/mcp` ile queued `event: message` (notification) eventlerini çekip stdio üzerinden yayınlar.

Gereken env:

- `AGENTMEMORY_BASE_URL` (ör: `http://127.0.0.1:3000`)
- `AGENTMEMORY_API_KEY` (test agent apiKey)
- opsiyonel: `AGENTMEMORY_MCP_PATH` (varsayılan: `/v1/mcp`)

Yerelde çalıştırma (dev):

```bash
AGENTMEMORY_BASE_URL=http://127.0.0.1:3000 \
AGENTMEMORY_API_KEY=YOUR_TEST_AGENT_KEY \
npm run mcp:stdio-proxy:dev
```

Build sonrası çalıştırma:

```bash
npm run build
AGENTMEMORY_BASE_URL=http://127.0.0.1:3000 \
AGENTMEMORY_API_KEY=YOUR_TEST_AGENT_KEY \
npm run mcp:stdio-proxy
```

Not: Proxy stdout'u MCP JSON-RPC mesajları için kullanır; debug/log çıktıları stderr'dedir.

## 5. Minimum uçtan uca senaryo

Aşağıdaki senaryo önce mutlaka çalıştırılmalı.

### Adım 1: Initialize

Beklenen:

- HTTP 200
- JSON-RPC `result`
- response header içinde `Mcp-Session-Id`
- `protocolVersion` döner

Doğrulanacaklar:

- client session id'yi saklıyor mu
- aynı id ile devam ediyor mu

### Adım 2: Initialized notification

Client `notifications/initialized` gönderir.

Beklenen:

- HTTP 202
- gövde olmayabilir

Doğrulanacaklar:

- client notification sonrası akışa devam ediyor mu

### Adım 3: Tools list

Client `tools/list` çağrısı yapar.

Beklenen tool isimleri:

- `memory_store`
- `memory_recall`
- `claw_context_build`
- `dream_run`

Doğrulanacaklar:

- client tool discovery yapabiliyor mu
- tool input schema parse ediliyor mu

### Adım 4: Memory store

Gerçek client üzerinden en az 3 farklı memory yaz:

1. episodic
2. procedural
3. introspective veya semantic

Önerilen içerik:

- deploy preview akışı
- rollback notu
- workspace veya thread bağlamı

Önerilen metadata alanları:

- `toolName`
- `action`
- `outcome`
- `workspaceId`
- `threadId`

Doğrulanacaklar:

- tool çağrısı başarıyla dönüyor mu
- `notifications/claw/memory_stored` queue'ya düşüyor mu
- store sonrası recall sonuçları değişiyor mu

### Adım 5: Memory recall

Gerçek client üzerinden recall çalıştır:

- query tabanlı recall
- metadata filtreli recall
- tag filtreli recall

Örnek beklenti:

- `deploy preview rollback` sorgusunda procedural memory üstte gelmeli
- `metadataFilters.toolName=shell` ile sadece ilgili kayıtlar gelmeli

Doğrulanacaklar:

- score alanları client tarafında bozulmadan okunuyor mu
- structured content parse ediliyor mu

### Adım 6: Claw context build

Gerçek client üzerinden `claw_context_build` çağır.

Beklenen:

- `context.summaries`
- `context.contextText`
- `context.stats`

Doğrulanacaklar:

- client bu context'i kendi prompt/runtime bağlamına koyabiliyor mu
- metadata bazlı filtre ile daraltılmış bağlam alınabiliyor mu

### Adım 7: Dream run

Gerçek client üzerinden `dream_run` çağrısı yap.

Beklenen:

- `dreamRun`
- `createdMemories`
- background notification: `notifications/claw/dream_completed`

Doğrulanacaklar:

- client dream sonucu oluşan yeni memory'leri görebiliyor mu
- aynı session içinde notification alabiliyor mu

## 6. SSE ve replay doğrulaması

Bu bölüm zorunlu.

### 6.1 Discovery stream

Client `GET /v1/mcp` ile stream açmalı.

Beklenen:

- `event: endpoint`
- daha önce kuyruklanmış `event: message` kayıtları

Doğrulanacaklar:

- client SSE stream'i parse edebiliyor mu
- event id'leri saklanıyor mu

### 6.2 Replay

Client bir event id sakladıktan sonra aynı stream'i `Last-Event-ID` ile tekrar açmalı.

Beklenen:

- verilen event'ten sonrakiler replay edilir
- aynı event tekrar gelmez

Doğrulanacaklar:

- reconnect sonrası veri kaybı var mı
- duplicate event handling doğru mu

### 6.3 Background notifications

Aşağıdaki işlemlerden sonra GET stream aç:

- `memory_store`
- `dream_run`

Beklenen queued notification'lar:

- `notifications/claw/memory_stored`
- `notifications/claw/dream_completed`

Doğrulanacaklar:

- gerçek Claw client bu notification'ları işleyebiliyor mu
- bu notification'lar loglanıyor veya gözlenebiliyor mu

## 7. Persistence doğrulaması

### 7.1 Process restart

Test planı:

1. session aç
2. birkaç tool çağrısı yap
3. servisi kapat
4. servisi yeniden başlat
5. aynı `Mcp-Session-Id` ile GET stream aç

Beklenen:

- session bulunur
- queued event'ler yeniden okunabilir

Bu senaryo hem `file` hem `postgres` için çalıştırılmalı.

### 7.2 TTL expiry

Test için kısa TTL kullan:

- örn. birkaç saniye

Plan:

1. session aç
2. TTL süresini bekle
3. aynı session ile tekrar `tools/list` veya `GET /v1/mcp` dene

Beklenen:

- HTTP 404 veya session yok davranışı
- client yeni `initialize` ile taze session açmalı

Doğrulanacaklar:

- gerçek Claw client 404 sonrası yeniden initialize yapabiliyor mu

## 8. Origin validation doğrulaması

Eğer gerçek Claw runtime bir `Origin` header gönderiyorsa bu kısım kritiktir.

Plan:

1. runtime origin değerini gözlemle
2. bu origin'i `MCP_ALLOWED_ORIGINS` içine ekle
3. çağrıları tekrar çalıştır

Başarısızlık belirtisi:

- HTTP 403
- `Origin not allowed for MCP transport`

## 9. Postgres ile ikinci tur test

İlk tur başarılı olduktan sonra aynı senaryoyu `postgres` ile tekrarla.

Doğrulanacak ek noktalar:

- `mcp_sessions` tablosuna session kaydı yazılıyor mu
- restart sonrası session durumu korunuyor mu
- recall performansı kabul edilebilir mi
- vector + metadata candidate search davranışı beklenen gibi mi

## 10. Gözlemlenmesi gereken hatalar

En sık sorun alanları:

1. client `Mcp-Session-Id` header'ını taşımıyor olabilir
2. client SSE yerine sadece JSON bekliyor olabilir
3. client `Last-Event-ID` kullanmıyor olabilir
4. `Origin` allowlist runtime ile uyuşmuyor olabilir
5. TTL yüzünden session beklenmedik şekilde düşüyor olabilir
6. tool schema parse hataları olabilir
7. client notification method isimlerini yok sayıyor olabilir

## 11. Başarı kriterleri

Gerçek Claw entegrasyonu başarılı sayılmalıysa aşağıdakilerin tamamı sağlanmalı:

- initialize akışı stabil
- session reuse stabil
- tools/list doğru
- tools/call akışı stabil
- memory store / recall / context / dream gerçek client üzerinden çalışıyor
- SSE discovery çalışıyor
- replay çalışıyor
- background notifications client tarafından gözlenebiliyor
- restart sonrası session korunuyor
- TTL expiry sonrası client yeniden initialize olabiliyor
- `file` ve `postgres` modları başarılı

## 12. Test raporu şablonu

Her deneme sonrası aşağıdaki alanları doldur:

- tarih
- Claw client sürümü
- transport tipi
- kullanılan origin
- storage driver
- initialize sonucu
- tools/list sonucu
- memory_store sonucu
- memory_recall sonucu
- claw_context_build sonucu
- dream_run sonucu
- SSE sonucu
- replay sonucu
- restart persistence sonucu
- TTL expiry sonucu
- gözlenen hata/loglar
- genel karar: geçti / kısmi / kaldı

## 13. Bu adımdan sonra gelecek iş

Bu rehber tamamlanıp gerçek Claw client ile başarı doğrulandığında sıradaki mantıklı adımlar:

- gerçek Claw client için örnek konfigürasyon dosyası
- production deployment rehberi
- gözlemlenebilirlik/metrics
- Claw-native embedding backend
- daha gelişmiş dream synthesis provider
