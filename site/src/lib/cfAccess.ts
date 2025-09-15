import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'

export type CfAccessClaims = JWTPayload & {
  email?: string
  groups?: string[]
  // Custom roles/groups claim key may be a URL-like namespace (e.g., Auth0 custom claim)
  [key: string]: unknown
}

export interface VerifyOptions {
  origin: string // e.g., https://wenzelarifiandi.com
  issuer?: string // optional issuer to validate against
}

// Verify CF Access JWT using JWKS from the same origin
export async function verifyCfAccessJwt(token: string, opts: VerifyOptions) {
  const { origin, issuer } = opts
  const jwksUrl = new URL('/cdn-cgi/access/certs', origin)
  const JWKS = createRemoteJWKSet(jwksUrl)
  const { payload } = await jwtVerify(token, JWKS, issuer ? { issuer } : {})
  return payload as CfAccessClaims
}

export function getOriginFromHeaders(headers: Headers): string {
  const host = headers.get('x-forwarded-host') || headers.get('host') || '127.0.0.1:4321'
  const proto = headers.get('x-forwarded-proto') || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return `${proto}://${host}`
}

export function getRequiredGroupsEnv() {
  const claim = process.env.CF_ACCESS_GROUPS_CLAIM || 'groups'
  const required = (process.env.CF_ACCESS_REQUIRED_GROUPS || '').split(',').map(s => s.trim()).filter(Boolean)
  return { claim, required }
}

export function getProtectedPrefixes(): string[] {
  return (process.env.CF_ACCESS_PROTECTED_PREFIXES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}
