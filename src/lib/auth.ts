import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export const ROLES = {
  KASIR: 'KASIR',
  ADMIN: 'ADMIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const MENU_ACCESS: Record<Role, string[]> = {
  KASIR: ['/pos', '/history'],
  ADMIN: [
    '/pos',
    '/history',
    '/stok',
    '/stok/masuk',
    '/stok/opname',
    '/supplier',
    '/gudang',
    '/laporan',
    '/pengaturan',
  ],
}

export function hasAccess(role: Role | null | undefined, path: string): boolean {
  if (!role) return false
  const allowed = MENU_ACCESS[role]
  if (!allowed) return false
  return allowed.some((p) => path === p || path.startsWith(p + '/'))
}
