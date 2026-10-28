# 回診專用 A4 PDF 輸出 (Vet Report)

Status: Implemented
Introduced: v1.0.0

## Purpose

讓照顧者一鍵產出獸醫看診時能快速掃視的標準化摘要，不需要自己排版試算表或截圖。

## Behavior

- 入口：首頁「回診摘要報告」卡片、紀錄頁（`/records`）右上角「回診報告」按鈕；報告頁左上角可返回紀錄頁。底部 Tab 的「紀錄」是血檢與趨勢圖頁，不是報告本身（v1.2 前 Tab 名稱為「報告」、卻連到紀錄頁，報告頁在 App 內沒有入口）。
- 純前端 CSS Print 佈局排版，A4 橫式摘要呈現。血檢表目前列出全部歷史紀錄，紀錄多時是否仍維持單頁尚待實測。
- 頁尾附完整醫療免責聲明。
- 匯出功能永久免費開放，PetVitals 沒有訂閱分級（見 [../00-product/scope.md](../00-product/scope.md)）。

## Related Documents

- 架構：`app/(export)/report/[petId]/page.tsx`，詳見 [../04-architecture/frontend.md](../04-architecture/frontend.md)
