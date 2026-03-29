# Solana Verified Builds (AgentMemory)

Bu doküman, AgentMemory Solana programını **verified build** olarak doğrulamak (Explorer/Solscan “Verified build” görünümü) için `solana-verify` akışını hazırlar.

> Not: `SOLANA_SECRET_KEY` **deployer / upgrade authority** olmalı. Bu repo’da deployer adresi yeni üretilmez.

## Önkoşullar

- Docker (çalışır halde) — sadece **local build** için
- Rust/Cargo
- Solana CLI
- Solana Verify CLI:

```bash
cargo install solana-verify
# İstersen versiyon pinleyebilirsin:
# cargo install solana-verify --version 0.4.14
```

## Repo hazırlığı (bu repo için)

`solana-verify verify-from-repo` repo kökünde `Cargo.lock` bekler ve program subfolder’daysa `--mount-path` ister.

Bu repo zaten şunları içeriyor:

- Workspace: `Cargo.toml` (repo root)
- Lockfile: `Cargo.lock` (repo root)
- Program: `chain/solana/program` (lib adı: `agentmemory_commitments`)

## 0) Yetki kontrolü (deployer doğru mu?)

```bash
solana program show $PROGRAM_ID
# Authority alanı, deployer wallet pubkey’in olmalı.
```

## 1) Deterministic (verifiable) build

> Güvenlik: `solana-verify build` Docker konteynerine repo içeriğini kopyalar/mount eder. Repo içinde `.env` gibi secret dosyaları bulunduruyorsan, verified build’i **temiz bir checkout** ile (secretsiz) yapmak daha güvenli.

```bash
# Repo root’tan çalıştırmak en net yol:
solana-verify build --library-name agentmemory_commitments

# Çıktı tipik olarak:
# target/deploy/agentmemory_commitments.so
```

İstersen build hash’i:

```bash
solana-verify get-executable-hash target/deploy/agentmemory_commitments.so
```

## Docker’ı localde kullanmadan (remote builder)

Eğer hedefin Explorer/Solscan “Verified build” ise ama Docker’ı kendi makinenizde çalıştırmak istemiyorsan, `solana-verify` komutunu `--remote` ile koşturabilirsin. Bu modda deterministik build uzakta yapılır (lokalde Docker çağrısı yoktur).

> Önemli: `solana-verify verify-from-repo --remote` şu an CLI tarafından **sadece mainnet** için destekleniyor. Devnet’te bu flag ile komut hata veriyor; devnet için local build (Docker) şart.

Helper script ile:

```bash
NETWORK_URL=https://api.devnet.solana.com \
PROGRAM_ID=$PROGRAM_ID \
REPO_URL=$REPO_URL \
COMMIT_HASH=$COMMIT_HASH \
MODE=remote \
./chain/solana/verified-builds.sh
```

### Toolchain uyumsuzluğu (Cargo çok eski / `edition2024` hatası)

Eğer remote build ortamı `edition2024` gibi bir hata veriyorsa, kullanılan verifiable-build imajının Cargo toolchain’i eskidir. Bu durumda `solana-verify` için base image override gerekebilir:

```bash
BASE_IMAGE=<custom-verifiable-build-image> MODE=remote ./chain/solana/verified-builds.sh
```

## 2) Deploy / Upgrade (aynı program id)

Verified build ile üretilen `.so` dosyasını deploy etmelisin; yoksa hash eşleşmez.

```bash
solana program deploy \
  -u $NETWORK_URL \
  target/deploy/agentmemory_commitments.so \
  --program-id $PROGRAM_ID \
  --use-rpc \
  --max-sign-attempts 100

# Eğer “account data too small” gibi bir hata alırsan,
# yeni binary mevcut ProgramData boyutunu aşıyordur; önce programı extend et:
# solana program extend $PROGRAM_ID 20000
```

## 3) Repo’ya karşı verify + PDA upload

Bu adım:
- On-chain program hash ile repo’daki commit’ten build edilen hash’i karşılaştırır
- İstersen verification metadata’yı (repo URL, commit hash, build args) **PDA’ya** yazar

```bash
solana-verify verify-from-repo \
  -u $NETWORK_URL \
  --program-id $PROGRAM_ID \
  $REPO_URL \
  --commit-hash $COMMIT_HASH \
  --library-name agentmemory_commitments \
  --mount-path chain/solana/program
```

Komut sonunda “upload verification data onchain?” sorarsa **YES** seç.

## 4) Remote job (OtterSec) – genelde mainnet için

Remote doğrulama (API/Explorer/Solscan tarafında “Verified” olarak görünme) için PDA yazıldıktan sonra remote job tetiklenir.

```bash
UPLOADER=$(solana address)
solana-verify remote submit-job --program-id $PROGRAM_ID --uploader $UPLOADER

# Job id dönerse:
# solana-verify remote get-job --job-id <job-id>
```

> Not: Solana dokümantasyonu “remote verification sadece mainnet’te çalışır” diye uyarıyor. Devnet’te PDA/metadata görünebilir ama “Verified” badge davranışı değişebilir.

## Anchor’a geçmek gerekiyor mu?

Hayır. Verified builds **Anchor şart değil**. Native program (şu anki gibi) ile de verified build yapabilirsin.

Anchor’a geçmek, daha standart tooling/IDL gibi şeyler sağlar ama:
- binary boyutu büyüyebilir
- program `max-len` limitlerine takılabilir
- eğer büyütme mümkün olmazsa yeni program id ile redeploy gerekebilir

Bu yüzden “verified” hedefi için en az riskli yol: **native programı koru + solana-verify ile deterministic build/deploy**.
