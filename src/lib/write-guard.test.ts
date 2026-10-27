import { describe, expect, it } from 'vitest'
import { mustWrite, mustWriteOne } from './write-guard'

/**
 * Row-level security does not refuse a write it disallows — it narrows it to
 * no rows and reports success. Four defects here have had that shape, each
 * reported as "it says it worked but nothing changed".
 *
 * These pin the only behaviour that matters: zero rows is a failure.
 */
describe('mustWrite', () => {
  it('returns the rows when the write landed', async () => {
    const rows = await mustWrite(Promise.resolve({ data: [{ id: '1' }], error: null }))
    expect(rows).toEqual([{ id: '1' }])
  })

  it('treats zero rows as a refusal, not a success', async () => {
    // Exactly what RLS hands back when it declines: no error, no rows.
    await expect(
      mustWrite(Promise.resolve({ data: [], error: null }))
    ).rejects.toThrow(/did not save/i)
  })

  it('treats a null payload the same way', async () => {
    await expect(
      mustWrite(Promise.resolve({ data: null, error: null }))
    ).rejects.toThrow(/did not save/i)
  })

  it('says what the person should do about it', async () => {
    await expect(
      mustWrite(Promise.resolve({ data: [], error: null }), {
        deniedMessage: 'Only a super admin can change roles and permissions.',
      })
    ).rejects.toThrow('Only a super admin can change roles and permissions.')
  })

  it('passes a real database error through unchanged', async () => {
    await expect(
      mustWrite(Promise.resolve({ data: null, error: { message: 'duplicate key' } }))
    ).rejects.toThrow('duplicate key')
  })

  it('hands back the single row for a one-row write', async () => {
    const row = await mustWriteOne(Promise.resolve({ data: [{ id: '7' }], error: null }))
    expect(row).toEqual({ id: '7' })
  })
})
