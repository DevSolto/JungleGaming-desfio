import 'reflect-metadata'

import { describe, expect, it } from 'vitest'

import type { PaginationMeta } from '@repo/types'

import { getCommentsDisplayRange } from '../TaskDetailsPage'

describe('getCommentsDisplayRange', () => {
  it('retorna zeros quando não há metadados ou comentários', () => {
    expect(getCommentsDisplayRange(undefined, 0)).toEqual({
      start: 0,
      end: 0,
      total: 0,
    })
  })

  it('calcula o intervalo exibido com base na página atual', () => {
    const meta: PaginationMeta = {
      total: 12,
      page: 1,
      size: 5,
      totalPages: 3,
    }

    expect(getCommentsDisplayRange(meta, 5)).toEqual({
      start: 1,
      end: 5,
      total: 12,
    })
  })

  it('respeita o total ao calcular o fim do intervalo', () => {
    const meta: PaginationMeta = {
      total: 12,
      page: 3,
      size: 5,
      totalPages: 3,
    }

    expect(getCommentsDisplayRange(meta, 2)).toEqual({
      start: 11,
      end: 12,
      total: 12,
    })
  })
})
