import { describe, expect, it } from 'vitest'
import { parseAmount } from './finance'

describe('parseAmount', () => {
  it.each([
    ['12', 12000],
    ['12,5', 12500],
    ['12.500', 12500],
    ['62,350', 62350],
    ['985.637', 985637],
    ['1 308,952', 1308952],
    ['1.308,952', 1308952],
    ['1,308.952', 1308952],
    ['1.308.952', 1308952000],
    ['1500 DT', 1500000],
    ['250 TND', 250000],
    ['0,001', 1],
  ])('reads %s', (text, millimes) => {
    expect(parseAmount(text)).toBe(millimes)
  })

  it.each(['', '0', 'abc', '-5', '1,2345', '12..5'])('rejects %s', (text) => {
    expect(parseAmount(text)).toBeNull()
  })
})

describe('parseAmount with 2-decimal currencies', () => {
  it('accepts cents and stores thousandths', () => {
    expect(parseAmount('12,50', 2)).toBe(12500)
    expect(parseAmount('1 299.99', 2)).toBe(1299990)
  })

  it('rejects a third decimal', () => {
    expect(parseAmount('12,345', 2)).toBeNull()
  })
})
