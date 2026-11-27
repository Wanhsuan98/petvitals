import { describe, expect, it } from 'vitest'

import { fitWithinEdge, isJpeg } from './image-limits'

describe('fitWithinEdge', () => {
  it('scales the long edge down to the limit and keeps the aspect ratio', () => {
    expect(fitWithinEdge(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithinEdge(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('never upscales small images', () => {
    expect(fitWithinEdge(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})

describe('isJpeg', () => {
  it('checks the JPEG magic bytes instead of trusting the MIME type', () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true)
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false)
    expect(isJpeg(new Uint8Array([]))).toBe(false)
  })
})
