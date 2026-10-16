# ADR-005: 單貓模式下擋掉「一個帳號照顧第二隻貓」

Status: Accepted（過渡措施，預計 v1.3 多隻貓咪管理上線時移除）
Introduced: v1.2.0

## Context

[ADR-001](./ADR-001-single-cat-mvp.md) 限制一人一貓，但只限制了 `cat_profiles.owner_id`，沒有限制「擁有自己的貓」或「已是別隻貓的協作者」時再接受協作邀請。

`getCatProfile()` 先回傳自己擁有的貓，沒有才回傳最早接受的協作貓，所以以下情況接受邀請後畫面顯示成功，實際上永遠看不到新的那隻貓：

- 自己已經有貓，再接受別人的邀請。
- 已經是 A 貓的協作者，再接受 B 貓的邀請。
- 已經是協作者，再自己建立貓咪資料（UI 不顯示表單，但 server action 沒擋）。

使用者以為接受成功、邀請人以為對方已經在協助，比直接拒絕更糟。

## Decision

「照顧中的貓」定義為「擁有的貓 + `ACCEPTED` 的協作貓」，一個帳號最多一隻。在三處檢查（`hasAccessibleCat()` 與 `getCatProfile()`）：

1. **送出邀請**（`inviteCaregiverAction`）：受邀者已在照顧一隻貓就直接回傳錯誤。邀請人的 RLS 讀不到受邀者資料，因此用 service-role client 查詢。這裡只是提早回饋。
2. **接受邀請**（`acceptCaregiverInvitationAction`）：真正的把關。邀請 `PENDING` 期間對方狀態可能改變，且此決策前送出的舊邀請沒經過第 1 點的檢查。
3. **建立貓咪資料**（`saveCatProfileAction`）：已是協作者（且沒有自己的貓）時拒絕。

提示文字說明原因（「目前一個帳號只能照顧一隻貓」），不使用「已達上限」等容易被誤解為付費方案限制的措辭——PetVitals 沒有收費方案。

只在應用層檢查，不加 DB trigger：這是 v1.3 就要移除的過渡限制，剩下的漏洞只有同一使用者在兩個分頁同時接受兩份邀請這種併發情況，後果是看不到其中一隻貓，不會造成越權存取。

## Consequences

- 邀請人會從錯誤訊息得知「這個 email 的帳號已經在照顧一隻貓」。現有的「找不到這個 email 對應的帳號」本來就會透露帳號是否存在，額外揭露有限；考量讓邀請人知道對方無法接受的價值較高，仍採用。
- 決策前已經存在的「擁有自己的貓又是協作者」舊資料不會自動清理，仍只看得到自己的貓。
- v1.3 開放多隻貓咪時，連同 `hasAccessibleCat()` 與三處檢查一起移除，改為貓咪切換 UI。

## Related

- [ADR-001](./ADR-001-single-cat-mvp.md)
- [ADR-003](./ADR-003-caregiver-cap.md)
- [協作需求](../01-requirements/caregivers.md)
- [Roadmap](../00-product/roadmap.md)
