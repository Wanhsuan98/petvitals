# 每日照護日誌 (Daily Care Log)

Status: Implemented
Introduced: v1.0.0

## Purpose

讓照顧者用最少的操作記錄每天的皮下輸液、飲水與體重，並取得當日達成度回饋。

## Behavior

- 皮下輸液量記錄，內建防手滑上限驗證，並與該貓醫囑單次量比對，超出時提示但不擋存檔。
- 飲水達成度（飲水量 ÷ 每日飲水目標）與輸液達成度（輸液量 ÷ 醫囑單次量 × 每日次數）分開呈現，不合併為單一總水分進度條。
- 體重記錄與近 7 天下滑趨勢計算（窗口內最高點 vs 最新值）。
- 同一天可有多筆記錄（含精確打卡時間），支援一天多次輸液的情境。

## Related Documents

- 資料契約：[../02-data-contract/daily-care-log.md](../02-data-contract/daily-care-log.md)
- Domain Logic：[../03-domain-logic/fluid-check.md](../03-domain-logic/fluid-check.md)、[../03-domain-logic/daily-progress.md](../03-domain-logic/daily-progress.md)、[../03-domain-logic/weight-alert.md](../03-domain-logic/weight-alert.md)
