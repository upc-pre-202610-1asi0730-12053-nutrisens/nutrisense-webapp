import { describe, it, expect } from 'vitest'
import { toCamelDeep, toPascalDeep } from './base-api.js'

// ---------------------------------------------------------------------------
// toCamelDeep
// ---------------------------------------------------------------------------
describe('toCamelDeep', () => {
  it('convierte claves PascalCase a camelCase en objeto plano', () => {
    expect(toCamelDeep({ FirstName: 'Juan', LastName: 'Pérez' })).toEqual({
      firstName: 'Juan',
      lastName: 'Pérez',
    })
  })

  it('convierte objetos anidados recursivamente', () => {
    const input = {
      UserId: 1,
      BodyMeasurements: { WaistCm: 82, NeckCm: 38 },
    }
    expect(toCamelDeep(input)).toEqual({
      userId: 1,
      bodyMeasurements: { waistCm: 82, neckCm: 38 },
    })
  })

  it('convierte arrays de objetos recursivamente', () => {
    const input = [{ FoodId: 1, NameEn: 'Oats' }, { FoodId: 2, NameEn: 'Rice' }]
    expect(toCamelDeep(input)).toEqual([
      { foodId: 1, nameEn: 'Oats' },
      { foodId: 2, nameEn: 'Rice' },
    ])
  })

  it('devuelve arrays de primitivos sin modificar', () => {
    expect(toCamelDeep(['gluten-free', 'lactose'])).toEqual(['gluten-free', 'lactose'])
  })

  it('devuelve null intacto', () => {
    expect(toCamelDeep(null)).toBeNull()
  })

  it('devuelve undefined intacto', () => {
    expect(toCamelDeep(undefined)).toBeUndefined()
  })

  it('devuelve string intacto', () => {
    expect(toCamelDeep('premium')).toBe('premium')
  })

  it('devuelve number intacto', () => {
    expect(toCamelDeep(42)).toBe(42)
  })

  it('devuelve boolean intacto', () => {
    expect(toCamelDeep(true)).toBe(true)
  })

  it('no transforma los VALORES string (enums, fechas)', () => {
    const input = { Status: 'premium', Date: '2026-06-17', Goal: 'weight-loss' }
    const result = toCamelDeep(input)
    expect(result.status).toBe('premium')
    expect(result.date).toBe('2026-06-17')
    expect(result.goal).toBe('weight-loss')
  })

  it('devuelve una Date intacta (no la convierte en {})', () => {
    const d = new Date('2026-06-17T00:00:00Z')
    const result = toCamelDeep({ CreatedAt: d })
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.createdAt).toBe(d)
  })

  it('devuelve un Blob intacto', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    expect(toCamelDeep(blob)).toBe(blob)
  })

  it('devuelve FormData intacto', () => {
    const fd = new FormData()
    fd.append('file', new Blob(['img']))
    expect(toCamelDeep(fd)).toBe(fd)
  })
})

// ---------------------------------------------------------------------------
// toPascalDeep
// ---------------------------------------------------------------------------
describe('toPascalDeep', () => {
  it('convierte claves camelCase a PascalCase en objeto plano', () => {
    expect(toPascalDeep({ firstName: 'Juan', lastName: 'Pérez' })).toEqual({
      FirstName: 'Juan',
      LastName: 'Pérez',
    })
  })

  it('convierte objetos anidados recursivamente', () => {
    const input = {
      userId: 1,
      macros: { proteinG: 12.5, carbsG: 30 },
    }
    expect(toPascalDeep(input)).toEqual({
      UserId: 1,
      Macros: { ProteinG: 12.5, CarbsG: 30 },
    })
  })

  it('convierte arrays de objetos recursivamente', () => {
    const input = [{ foodId: 1 }, { foodId: 2 }]
    expect(toPascalDeep(input)).toEqual([{ FoodId: 1 }, { FoodId: 2 }])
  })

  it('devuelve arrays de primitivos sin modificar', () => {
    expect(toPascalDeep(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('devuelve null intacto', () => {
    expect(toPascalDeep(null)).toBeNull()
  })

  it('devuelve undefined intacto', () => {
    expect(toPascalDeep(undefined)).toBeUndefined()
  })

  it('devuelve string intacto', () => {
    expect(toPascalDeep('manual')).toBe('manual')
  })

  it('devuelve number intacto', () => {
    expect(toPascalDeep(0)).toBe(0)
  })

  it('devuelve boolean intacto', () => {
    expect(toPascalDeep(false)).toBe(false)
  })

  it('no transforma los VALORES string (enums, fechas)', () => {
    const input = { mealType: 'breakfast', date: '2026-06-17', source: 'manual' }
    const result = toPascalDeep(input)
    expect(result.MealType).toBe('breakfast')
    expect(result.Date).toBe('2026-06-17')
    expect(result.Source).toBe('manual')
  })

  it('devuelve una Date intacta', () => {
    const d = new Date('2026-06-17T00:00:00Z')
    const result = toPascalDeep({ createdAt: d })
    expect(result.CreatedAt).toBeInstanceOf(Date)
    expect(result.CreatedAt).toBe(d)
  })

  it('devuelve un Blob intacto', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    expect(toPascalDeep(blob)).toBe(blob)
  })

  it('devuelve FormData intacto', () => {
    const fd = new FormData()
    fd.append('file', new Blob(['img']))
    expect(toPascalDeep(fd)).toBe(fd)
  })
})

// ---------------------------------------------------------------------------
// Round-trip: toCamelDeep(toPascalDeep(x)) ≈ x para claves normales
// ---------------------------------------------------------------------------
describe('round-trip toCamelDeep(toPascalDeep(x))', () => {
  it('objeto plano simple', () => {
    const original = { userId: 1, firstName: 'Juan', activeGoal: 'weight-loss' }
    expect(toCamelDeep(toPascalDeep(original))).toEqual(original)
  })

  it('objeto con anidamiento', () => {
    const original = {
      userId: 42,
      bodyMeasurements: { waistCm: 82, neckCm: 38 },
      dietaryRestrictions: ['gluten-free'],
    }
    expect(toCamelDeep(toPascalDeep(original))).toEqual(original)
  })

  it('array de objetos', () => {
    const original = [{ foodId: 1, nameEn: 'Oats' }, { foodId: 2, nameEn: 'Rice' }]
    expect(toCamelDeep(toPascalDeep(original))).toEqual(original)
  })
})
