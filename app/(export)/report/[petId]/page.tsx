// 獸醫回診專用 A4 摘要報告頁 (CSS Print 專用佈局)
export default async function ReportPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  return (
    <div className="print:p-0">
      <h1 className="text-xl font-semibold">回診摘要報告（{petId}）</h1>
      <p className="text-sm text-muted-foreground">
        A4 橫式列印佈局（待實作 CSS Print + PDF 匯出）
      </p>
    </div>
  )
}
