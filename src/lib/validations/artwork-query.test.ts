import { describe, it, expect } from 'vitest'
import { parseArtworkQuery } from './artwork-query'

describe('parseArtworkQuery', () => {
  it('aplica defaults quando vazio', () => {
    const q = parseArtworkQuery(new URLSearchParams())
    expect(q).toMatchObject({ sort: 'recent', page: 1, pageSize: 40, isFree: undefined, onlyFavorites: undefined })
    expect(q.categoryId).toBeUndefined()
    expect(q.ids).toBeUndefined()
  })

  it('mapeia parâmetros da URL para o objeto tipado', () => {
    const q = parseArtworkQuery(
      new URLSearchParams('cat=c1&tag=t1&free=1&fav=1&sort=downloads&page=3&q=flor')
    )
    expect(q).toMatchObject({
      categoryId: 'c1',
      tagId: 't1',
      isFree: true,
      onlyFavorites: true,
      sort: 'downloads',
      page: 3,
      q: 'flor',
    })
  })

  it('flags ausentes/nullos não quebram o parse (free=0, fav=abc)', () => {
    const q = parseArtworkQuery(new URLSearchParams('free=0&fav=abc'))
    expect(q.isFree).toBeUndefined()
    expect(q.onlyFavorites).toBeUndefined()
  })

  it('clampa pageSize em [1,60] (CA-6)', () => {
    expect(parseArtworkQuery(new URLSearchParams('pageSize=100')).pageSize).toBe(60)
    expect(parseArtworkQuery(new URLSearchParams('pageSize=0')).pageSize).toBe(1)
  })

  it('page inválido cai no default 1', () => {
    expect(parseArtworkQuery(new URLSearchParams('page=abc')).page).toBe(1)
  })

  it('divide ids CSV e remove tokens vazios', () => {
    const q = parseArtworkQuery(new URLSearchParams('fav=1&ids=a,b,,c'))
    expect(q.ids).toEqual(['a', 'b', 'c'])
  })

  it('sort inválido cai no default recent', () => {
    expect(parseArtworkQuery(new URLSearchParams('sort=xyz')).sort).toBe('recent')
  })
})
