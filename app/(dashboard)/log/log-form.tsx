'use client'

import { Droplets } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

import { ConfirmDeleteButton } from '@/components/confirm-delete-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyCareLog } from '@/lib/schemas'
import { useLocalTime } from '@/lib/use-local-time'
import { toLocalDateString } from '@/lib/utils'

import { DailyCareLogForm } from './daily-care-log-form'
import { deleteDailyCareLogAction } from './edit-actions'

function formatLogTime(recordedAt: string): string {
  return new Date(recordedAt).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function DailyCareLogActions({ id, timeLabel }: { id: string; timeLabel: string }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <Link href={`/log/${id}/edit`} aria-label={`編輯 ${timeLabel} 的打卡紀錄`}>
            編輯
          </Link>
        }
      />
      <ConfirmDeleteButton
        itemLabel={`${timeLabel} 的打卡紀錄`}
        onDelete={() => deleteDailyCareLogAction({ status: 'idle' }, id)}
      />
    </div>
  )
}

export function LogForm({ dailyCareLogs }: { dailyCareLogs: DailyCareLog[] }) {
  const localTime = useLocalTime()
  const todayDate = localTime === null ? '' : toLocalDateString(new Date(localTime))
  const todayLogs = useMemo(
    () => dailyCareLogs.filter((log) => log.date === todayDate),
    [dailyCareLogs, todayDate]
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>每日打卡</CardTitle>
          <CardDescription>
            10 秒記錄今天的輸液量 / 飲水量 / 體重，資料會依裝置本地時間歸入當天。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DailyCareLogForm />
        </CardContent>
      </Card>

      {todayLogs.length > 0 && (
        <section aria-label="今日已記錄">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold">今日已記錄 ({todayLogs.length} 筆)</h2>
          </div>
          <div className="space-y-3">
            {todayLogs.map((log) => (
              <div
                key={log.id}
                className="space-y-3 rounded-2xl bg-card p-4 shadow-(--card-shadow)"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Droplets className="size-5" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-bold">
                      輸液 {log.subQFluidMl}ml・飲水 {log.waterIntakeMl}ml
                      {typeof log.weightKg === 'number' ? `・體重 ${log.weightKg}kg` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {formatLogTime(log.recordedAt)}
                  </span>
                </div>
                {log.id && (
                  <DailyCareLogActions id={log.id} timeLabel={formatLogTime(log.recordedAt)} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
