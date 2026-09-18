# IRIS Reference

## Source

International Renal Interest Society (IRIS) 分期照護建議中的血磷控制目標。

## Applicable Version

⚠️ 尚未填寫。目前程式碼裡的數值是專案早期整理的結果，沒有記錄是依據哪一版 IRIS 官方指引、哪個年份。這是一個真實的缺口，建議近期找時間對照 IRIS 官方網站當前版本補上，而不是假設現有數值仍然正確。

## Phosphorus Targets

| Stage | Target Max (mg/dL) |
| :--- | ---: |
| Stage 1 | 4.5 |
| Stage 2 | 4.5 |
| Stage 3 | 5.0 |
| Stage 4 | 6.0 |

## Product Usage

PetVitals 僅將這些數值用於參考／警示呈現。應用程式不做 CKD 分期的自動診斷判定，`irisStage` 由使用者依獸醫診斷結果手動設定。

## Verification

- Last verified：⚠️ 尚未記錄
- Verified by：⚠️ 尚未記錄

## Update Policy

當 IRIS 指引更新時：

1. 更新本文件
2. 更新 `lib/clinical.ts` 裡的 `thresholdMap` 常數
3. 更新 `lib/clinical.test.ts` 的測試案例
4. 更新 `CHANGELOG.md`
5. 建立對應 release

## Related

- [../03-domain-logic/phosphorus.md](../03-domain-logic/phosphorus.md)
- [../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)
