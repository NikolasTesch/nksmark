import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('public/placeholder.svg', () => {
  const svg = readFileSync(join(process.cwd(), 'public/placeholder.svg'), 'utf8')

  it('existe e é um SVG 4:5 com marca NKS', () => {
    expect(svg).toMatch(/<svg/i)
    expect(svg).toMatch(/viewBox="0 0 400 500"/)
    expect(svg).toContain('#F2F2F2')
    expect(svg).toContain('#B31217')
    expect(svg).toContain('NKS')
  })

  it('não referencia o placeholder.jpg quebrado', () => {
    expect(svg).not.toMatch(/placeholder\.jpg/)
  })
})
