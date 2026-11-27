'use client'

import { fitWithinEdge, MAX_REPORT_IMAGE_BYTES, MAX_REPORT_IMAGE_EDGE } from '@/lib/ai/image-limits'

export class ImageReadError extends Error {
  constructor() {
    super('無法讀取這張照片，請改用 JPG 或 PNG 格式')
    this.name = 'ImageReadError'
  }
}

export class ImageTooLargeError extends Error {
  constructor() {
    super('照片壓縮後仍然太大，請裁切後再試')
    this.name = 'ImageTooLargeError'
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// 把使用者選的照片壓縮成 JPEG：長邊最多 1600 px、檔案 900 KB 以下（Server Action 的 body 上限是 1MB）。
// 用 canvas 重新編碼，輸出的 JPEG 不含原照片的 EXIF：手機照片的 EXIF 可能有 GPS 位置與裝置資訊，
// 不能送出去（見 docs/02-data-contract/blood-test-extraction.md）。
// imageOrientation: 'from-image' 讓直拍的照片依 EXIF 轉正後再畫，轉正後方向資訊就不需要了
export async function compressReportImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // 例如部分瀏覽器無法解碼 HEIC
    throw new ImageReadError()
  }

  try {
    let maxEdge = MAX_REPORT_IMAGE_EDGE
    // 先降畫質，還是太大就縮小尺寸再試；報告文字太小會辨識不出來，所以最多縮兩次
    for (let attempt = 0; attempt < 3; attempt++) {
      const { width, height } = fitWithinEdge(bitmap.width, bitmap.height, maxEdge)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new ImageReadError()
      context.drawImage(bitmap, 0, 0, width, height)

      for (const quality of [0.85, 0.75, 0.65]) {
        const blob = await canvasToJpeg(canvas, quality)
        if (blob && blob.size <= MAX_REPORT_IMAGE_BYTES) return blob
      }
      maxEdge = Math.round(maxEdge * 0.75)
    }
    throw new ImageTooLargeError()
  } finally {
    bitmap.close()
  }
}
