# Fluid Prescription Check

Status: Implemented
Introduced: v1.0.0
Implementation: `checkFluidOverPrescribed()` in `lib/clinical.ts`
Tests: `lib/clinical.test.ts`

## Purpose

軟性提示本次記錄的輸液量是否超出該貓的醫囑單次量，讓照顧者能及早發現手誤或需要跟獸醫確認的劑量調整，但不因此擋下存檔。

## Current Rule

```
isOverPrescribed = subQFluidMl > prescribedMl
```

## Behavior

- 超出醫囑量 → 回傳提示訊息，請照顧者確認是否手誤或已與獸醫師確認調整
- 未超出 → `message = null`

## Important

這是「防呆上限」與「醫療處方上限」分離設計的其中一半：
- `DailyCareLogSchema.subQFluidMl` 本身有 0–600ml 的硬性上限，是純輸入手滑防呆（例如誤打成 4000），不管哪隻貓都一樣。
- 這個函式比對的是「該貓實際醫囑量」（`CatProfile.subQFluidPrescribedMl`），超出僅提示、不擋存檔，因為每隻貓的醫囑劑量不同，且照顧者可能是刻意在獸醫指示下臨時調整劑量。

## Related Data Contract

- [cat-profile.md](../02-data-contract/cat-profile.md)（`subQFluidPrescribedMl` 欄位）
- [daily-care-log.md](../02-data-contract/daily-care-log.md)（`subQFluidMl` 欄位）
