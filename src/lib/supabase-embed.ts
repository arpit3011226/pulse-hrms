/**
 * PostgREST returns a single object for a to-one embed, but the generated types
 * widen every embed to an array. Code that reads `row.employee.first_name` is
 * therefore correct at runtime and wrong according to the types — which is what
 * the `as any` casts around the reports were papering over.
 *
 * Narrow it here instead, once, so the call site stays readable and typed.
 */
export function one<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}
