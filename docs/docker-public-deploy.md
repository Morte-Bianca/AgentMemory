# Docker ile Public (Geçici) Deploy Rehberi

Bu doküman, AgentMemory'yi Docker ile public erişilebilir şekilde çalıştırmak için minimum adımları verir.

> Uyarı: `TEST_MODE=true` herkesin aynı "public agent" üzerinden memory yazıp okumasına izin verir.
> Bu sadece kısa süreli test içindir.

## 1) Docker Compose ile çalıştır

Repo kökünde:

```bash
docker compose up -d --build
```

Servis:

- HTTP: `http://<SUNUCU_IP>:3000`
- Health: `GET /health`
- MCP: `POST /v1/mcp` ve `GET /v1/mcp`

Veri kalıcılığı:

- `agentmemory-data` named volume içine `/app/data/store.json` yazılır.

## 2) Public test modu (auth kapalı)

Compose varsayılanında public test modu açıktır:

- `TEST_MODE=true`

Bu modda:

- API key göndermeden MCP ve diğer korumalı endpoint'ler çalışır.
- Herkes aynı paylaşımlı agent verisini paylaşır.

## 3) Normal moda (auth açık) geç

`docker-compose.yml` içinde:

- `TEST_MODE: "false"`

Sonra yeniden başlat:

```bash
docker compose up -d
```

Bu modda API key gereklidir.

## 4) Origin (browser testleri)

Browser tabanlı bir istemci test edeceksen:

- Public test için hızlı seçenek: `MCP_ALLOWED_ORIGINS=*`
- Daha güvenli seçenek: client origin'lerini virgülle listelemek

## 5) Public URL

Docker container tek başına TLS sağlamaz.
Public erişim için tipik yaklaşım:

- Reverse proxy (Caddy / Nginx) ile `https://` terminasyonu
- Firewall ile sadece gerekli portları açma

