'use client'

import { startTransition, useActionState } from 'react'

import { Button } from '@/components/ui/button'
import type { Subscription } from '@/lib/data/subscriptions'

import {
  cancelSubscriptionAction,
  refreshSubscriptionStatusAction,
  type CancelSubscriptionState,
  type RefreshSubscriptionState
} from './actions'

const INITIAL_CANCEL_STATE: CancelSubscriptionState = { status: 'idle' }
const INITIAL_REFRESH_STATE: RefreshSubscriptionState = { status: 'idle' }

export function SubscriptionSection({ subscription }: { subscription: Subscription | null }) {
  const [state, formAction, isPending] = useActionState(
    cancelSubscriptionAction,
    INITIAL_CANCEL_STATE
  )
  const [refreshState, refreshFormAction, isRefreshing] = useActionState(
    refreshSubscriptionStatusAction,
    INITIAL_REFRESH_STATE
  )

  function onCancel() {
    startTransition(() => {
      formAction()
    })
  }

  function onRefresh() {
    startTransition(() => {
      refreshFormAction()
    })
  }

  if (subscription?.status === 'active') {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          訂閱中・每月 NT$ {subscription.periodAmount}
          {subscription.lastPaidAt && (
            <span className="text-muted-foreground">
              ・最近一次扣款 {new Date(subscription.lastPaidAt).toLocaleDateString('zh-TW')}
            </span>
          )}
        </p>

        {state.status === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        {state.status === 'success' && <p className="text-sm text-primary">{state.message}</p>}

        <Button variant="outline" disabled={isPending} onClick={onCancel}>
          {isPending ? '取消中…' : '取消訂閱'}
        </Button>
      </div>
    )
  }

  if (subscription?.status === 'pending') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          訂閱處理中，請稍候並重新整理本頁確認結果。若你已完成付款頁面的操作，狀態會在收到通知後更新。
          若你當初中途離開了付款頁面沒有完成付款，可以放棄這筆再重新訂閱一次。
        </p>

        {state.status === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        {refreshState.status === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            {refreshState.message}
          </p>
        )}
        {refreshState.status === 'success' && (
          <p className="text-sm text-primary">{refreshState.message}</p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" disabled={isRefreshing} onClick={onRefresh}>
            {isRefreshing ? '查詢中…' : '重新查詢狀態'}
          </Button>
          <Button variant="outline" disabled={isPending} onClick={onCancel}>
            {isPending ? '處理中…' : '放棄這筆未完成的訂閱'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">月費訂閱：NT$ 199 / 月，可隨時取消。</p>
      <form action="/api/ecpay/checkout" method="POST">
        <Button type="submit">訂閱 NT$199/月</Button>
      </form>
    </div>
  )
}
