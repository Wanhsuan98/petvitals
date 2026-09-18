# 回診專用 A4 PDF 輸出 (Vet Report)

Status: Implemented
Introduced: v1.0.0

## Purpose

讓照顧者一鍵產出獸醫看診時能快速掃視的標準化摘要，不需要自己排版試算表或截圖。

## Behavior

- 純前端 CSS Print 佈局排版，單頁 A4 橫式摘要呈現。
- 匯出功能對免費與訂閱使用者一律開放，不因訂閱狀態閹割（見 [../00-product/scope.md](../00-product/scope.md) 訂閱分級表）。

## Related Documents

- 架構：`app/(export)/report/[petId]/page.tsx`，詳見 [../04-architecture/frontend.md](../04-architecture/frontend.md)
