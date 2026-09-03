import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PetVitals 服務說明',
  description: '慢性腎病貓咪居家照護紀錄與回診報告工具——服務說明、價格方案與相關政策'
}

export default function ServicePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 p-6 pb-16">
      <header className="space-y-2 pt-8">
        <p className="text-sm font-medium text-primary">PetVitals</p>
        <h1 className="text-2xl font-semibold">慢性腎病貓咪居家照護紀錄與回診報告工具</h1>
        <p className="text-sm text-muted-foreground">
          本服務目前為上線籌備階段，此頁面提供服務說明、價格方案與相關政策資訊。
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">服務說明</h2>
        <p className="text-sm text-muted-foreground">
          PetVitals 是專為確診慢性腎衰竭（IRIS 1–4
          期）家貓設計的居家照護紀錄工具。透過每日打卡記錄輸液量、飲水量與體重，
          自動計算輸液/飲水達成度；記錄血檢數值後，依所設定的 IRIS
          分期自動比對血磷控制建議；並可一鍵匯出回診用 A4 摘要報告，協助飼主與獸醫師溝通。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">價格方案</h2>
        <p className="text-sm text-muted-foreground">
          會員訂閱制：新台幣 199 元 / 月，可隨時取消訂閱。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">退款政策</h2>
        <p className="text-sm text-muted-foreground">
          訂閱費用採按月計費，取消訂閱後於當期到期日前仍可繼續使用服務，到期後不再續扣款，恕不提供已扣款當期費用之部分退款。
          若因系統故障導致服務無法正常使用達 7 日以上，可聯繫客服申請該期費用全額退還。
        </p>
        <p className="text-xs text-muted-foreground">
          （以上為草稿內容，正式上線前請自行確認是否符合實際營運方式與消費者保護相關規範，非正式法律意見。）
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">隱私權政策</h2>
        <p className="text-sm text-muted-foreground">
          本服務僅蒐集使用者為使用服務所必要提供之資料，包括帳號資訊與使用者自行輸入之貓咪照護紀錄（輸液量、飲水量、體重、
          血檢數值等）。上述資料僅用於提供服務本身（如趨勢圖表與回診報告產出），不會提供第三方作行銷用途。金流交易資訊由
          第三方支付服務商（綠界科技 ECPay）獨立處理，本服務不會接觸或儲存您的信用卡資訊。
        </p>
        <p className="text-xs text-muted-foreground">
          （以上為草稿內容，正式上線前建議諮詢專業法律意見以符合個資法相關規範，非正式法律意見。）
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">聯絡方式</h2>
        <p className="text-sm text-muted-foreground">
          客服信箱：<span className="font-medium text-foreground">petvitals.service@gmail.com</span>
        </p>
      </section>

      <section className="space-y-2 border-t pt-6">
        <h2 className="text-lg font-semibold">醫療免責聲明</h2>
        <p className="text-xs text-muted-foreground">
          本系統（PetVitals）僅作為飼主居家健康數據記錄、歷史趨勢可視化與日常照護之輔助工具，不具備獸醫臨床診斷功能，
          亦不構成任何醫療處方與治療建議。系統提供之 IRIS
          分期標準與警戒提示僅供參考，毛孩之確切病情、輸液劑量與處方用藥，
          請務必遵循執業獸醫師之醫囑與指導。
        </p>
      </section>
    </div>
  )
}
