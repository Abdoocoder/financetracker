import { mapInBatches } from '@/lib/batch'

describe('mapInBatches', () => {
  it('returns results in input order', async () => {
    const result = await mapInBatches([1, 2, 3, 4, 5], 2, async (n) => n * 10)
    expect(result).toEqual([10, 20, 30, 40, 50])
  })

  it('never runs more than batchSize items concurrently', async () => {
    let inFlight = 0
    let peak = 0

    await mapInBatches(Array.from({ length: 25 }, (_, i) => i), 10, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight--
    })

    expect(peak).toBe(10)
  })

  it('passes the original index to the callback', async () => {
    const seen: Array<[string, number]> = []
    await mapInBatches(['a', 'b', 'c'], 2, async (item, index) => {
      seen.push([item, index])
    })
    expect(seen).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ])
  })

  it('handles an empty list without calling the callback', async () => {
    const fn = jest.fn()
    await expect(mapInBatches([], 5, fn)).resolves.toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })

  it('handles a list smaller than one batch', async () => {
    await expect(mapInBatches([1, 2], 10, async (n) => n)).resolves.toEqual([1, 2])
  })

  it('rejects the whole run when any item rejects (fail-fast)', async () => {
    await expect(
      mapInBatches([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom')
        return n
      })
    ).rejects.toThrow('boom')
  })

  it('rejects an invalid batch size instead of looping forever', async () => {
    await expect(mapInBatches([1], 0, async (n) => n)).rejects.toThrow(/batchSize/)
    await expect(mapInBatches([1], -1, async (n) => n)).rejects.toThrow(/batchSize/)
  })
})
