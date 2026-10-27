import { createConnectTransport } from '@connectrpc/connect-web'
import type { Interceptor } from '@connectrpc/connect'

// The console sends the OIDC ID token, never the OAuth access token, as the
// Authorization: Bearer credential. The server verifies the bearer with an ID
// token verifier (see console/rpc/auth.go), which requires a JWT with aud equal
// to the client ID. ID tokens are always JWTs with well defined claims (OpenID
// Connect Core 1.0, Section 2). Access tokens are opaque to the client (RFC
// 6749, Section 1.4) and their format and audience vary by provider; Keycloak
// access tokens, for example, do not carry the client ID in aud. See
// docs/authentication.md.

// jwtExpiry returns the exp claim of a JWT in seconds since the epoch, or
// undefined if the token cannot be decoded or has no numeric exp claim.
export function jwtExpiry(token: string): number | undefined {
  try {
    const payload = token.split('.')[1]
    if (!payload) return undefined
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp === 'number' ? exp : undefined
  } catch {
    return undefined
  }
}

// bearerToken returns the ID token to send as the Authorization: Bearer
// credential for the given oidc-client-ts user, or null if there is none or it
// has expired. Expiry is taken from the ID token's own exp claim; the user's
// expires_at describes the access token and is only a fallback.
export function bearerToken(
  user: { id_token?: string; expires_at?: number } | null | undefined,
): string | null {
  const idToken = user?.id_token
  if (!idToken) return null
  const exp = jwtExpiry(idToken) ?? user?.expires_at
  if (exp && exp * 1000 < Date.now()) return null
  return idToken
}

// readStoredToken reads the ID token from sessionStorage synchronously at
// module load time. oidc-client-ts stores the user object under a key matching
// "oidc.user:<authority>:<client_id>". Reading it here ensures tokenRef is
// populated before any React effect runs, eliminating the timing race where
// child query hooks fire before AuthProvider's useEffect sets the token.
// Expired tokens are treated as absent; silent renew in AuthProvider replaces
// them.
export function readStoredToken(): string | null {
  try {
    const key = Object.keys(sessionStorage).find((k) => k.startsWith('oidc.user:'))
    if (!key) return null
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return bearerToken(JSON.parse(raw) as { id_token?: string; expires_at?: number })
  } catch {
    return null
  }
}

// Shared mutable ref for the current ID token.
// Initialized synchronously from sessionStorage so that the very first RPC
// request (before any React effect runs) already carries the correct token for
// returning authenticated users. AuthProvider keeps this current on
// login/logout/token refresh via a useEffect.
export const tokenRef: { current: string | null } = { current: readStoredToken() }

// authInterceptor sets Authorization: Bearer <id_token> on every RPC.
export const authInterceptor: Interceptor = (next) => async (req) => {
  if (tokenRef.current) {
    req.header.set('Authorization', `Bearer ${tokenRef.current}`)
  }
  return next(req)
}

export const transport = createConnectTransport({
  baseUrl: '/',
  interceptors: [authInterceptor],
})
