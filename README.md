# PetVitals

慢性腎病（CKD）貓咪居家照護紀錄與回診報告 PWA。

## Why PetVitals?

慢性腎病貓的照護需要每天記錄輸液量、飲水量、體重，並定期比對血檢指標。這件事技術上可以用 Excel 做，但真正的痛點不是「算不出來」，而是：照顧者常常是在忙著顧病貓的當下，用手機而不是筆電；需要有人主動提醒該打針了，而不是自己記得去查表；回診時需要一份獸醫一眼就看得懂的摘要，而不是自己排版的試算表截圖。PetVitals 把這些痛點變成一個 10 秒打卡、主動提醒、一鍵匯出的行動優先工具。

核心記錄與匯出功能永久免費；訂閱解鎖多照護者協作與主動提醒排程，讓照護不因單一人力而中斷。

> ⚠️ PetVitals 僅作為居家健康數據記錄與趨勢可視化工具，不具備獸醫臨床診斷功能，亦不構成醫療處方或治療建議。詳見 [醫療免責聲明](docs/99-reference/medical-disclaimer.md)。

## Features

- ✓ 每日照護日誌（輸液量／飲水量／體重，10 秒極速打卡）
- ✓ 生化血檢紀錄與 IRIS 分期血磷警示
- ✓ 多軸趨勢圖表（體重 vs 輸液量、BUN/Crea vs 血磷）
- ✓ 一鍵匯出 A4 回診摘要 PDF
- ✓ 綠界 ECPay 定期定額訂閱
- 🔜 多照護者協作、主動提醒排程（規劃中，見 [docs/06-releases/v1.2.0.md](docs/06-releases/v1.2.0.md)）

## Tech Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Shadcn UI · Zod · TanStack Query · Supabase (PostgreSQL + Auth + RLS) · Chart.js · 綠界 ECPay

## Getting Started

```bash
pnpm install
pnpm dev
```

開啟 [http://localhost:4000](http://localhost:4000)。

### 環境變數

在專案根目錄建立 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# 選填：本機開發沒設定時會自動退回綠界公開的測試帳號
ECPAY_MERCHANT_ID=...
ECPAY_HASH_KEY=...
ECPAY_HASH_IV=...
```

⚠️ 正式環境（`NODE_ENV=production`）必須設定 `ECPAY_MERCHANT_ID`/`ECPAY_HASH_KEY`/`ECPAY_HASH_IV`，否則啟動時會直接拋錯——這是刻意設計，避免正式站不小心用到公開的綠界測試帳號。

### 常用指令

```bash
pnpm dev           # 啟動開發伺服器 (port 4000)
pnpm build         # 建置正式版
pnpm test          # 執行 Vitest 測試
pnpm lint          # ESLint 檢查
pnpm format        # Prettier 格式化
```

## Documentation

完整規格文件在 [`docs/`](docs/)：

| 主題 | 位置 |
| :--- | :--- |
| 產品定位、範疇、訂閱分級 | [docs/00-product/](docs/00-product/) |
| 各功能需求 | [docs/01-requirements/](docs/01-requirements/) |
| 資料契約 (Zod Schema) | [docs/02-data-contract/](docs/02-data-contract/) |
| 臨床/業務邏輯 | [docs/03-domain-logic/](docs/03-domain-logic/) |
| 系統架構 | [docs/04-architecture/](docs/04-architecture/) |
| 設計決策紀錄 (ADR) | [docs/05-decisions/](docs/05-decisions/) |
| 版本交付紀錄 | [docs/06-releases/](docs/06-releases/) |
| IRIS 參考標準、免責聲明 | [docs/99-reference/](docs/99-reference/) |

版本異動請見 [CHANGELOG.md](CHANGELOG.md)。

## Disclaimer

PetVitals is not a diagnostic tool. See [full medical disclaimer](docs/99-reference/medical-disclaimer.md)（中文全文）。
