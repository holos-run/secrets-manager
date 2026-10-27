import { tokenRef, readStoredToken, bearerToken, jwtExpiry, authInterceptor } from './transport'

const STORAGE_KEY = 'oidc.user:https://localhost:8443/dex:secrets-manager'

// fakeJwt builds an unsigned JWT-shaped string carrying the given payload.
function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64url(JSON.stringify({ alg: 'RS256' }))}.${b64url(JSON.stringify(payload))}.sig`
}

const nowSec = () => Math.floor(Date.now() / 1000)

describe('tokenRef', () => {
  afterEach(() => {
    tokenRef.current = null
  })

  it('starts with null', () => {
    expect(tokenRef.current).toBeNull()
  })

  it('can be set to a token string', () => {
    tokenRef.current = 'test-token-123'
    expect(tokenRef.current).toBe('test-token-123')
  })

  it('can be reset to null', () => {
    tokenRef.current = 'test-token-123'
    tokenRef.current = null
    expect(tokenRef.current).toBeNull()
  })
})

describe('authInterceptor', () => {
  afterEach(() => {
    tokenRef.current = null
  })

  async function sentHeaders(): Promise<Headers> {
    const header = new Headers()
    const next = vi.fn().mockResolvedValue({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await authInterceptor(next)({ header } as any)
    expect(next).toHaveBeenCalledOnce()
    return header
  }

  it('sends the ID token in tokenRef as the bearer', async () => {
    const idToken = fakeJwt({ aud: 'secrets-manager', exp: nowSec() + 3600 })
    tokenRef.current = idToken
    expect((await sentHeaders()).get('Authorization')).toBe(`Bearer ${idToken}`)
  })

  it('sends the ID token read from the stored session, not the access token', async () => {
    const idToken = fakeJwt({ aud: 'secrets-manager', exp: nowSec() + 3600 })
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id_token: idToken, access_token: 'opaque-access-token', expires_at: nowSec() + 3600 }),
    )
    tokenRef.current = readStoredToken()
    sessionStorage.clear()
    const auth = (await sentHeaders()).get('Authorization')
    expect(auth).toBe(`Bearer ${idToken}`)
    expect(auth).not.toContain('opaque-access-token')
  })

  it('omits the Authorization header when there is no token', async () => {
    expect((await sentHeaders()).has('Authorization')).toBe(false)
  })
})

describe('jwtExpiry', () => {
  it('returns the exp claim', () => {
    expect(jwtExpiry(fakeJwt({ exp: 1234 }))).toBe(1234)
  })

  it('returns undefined for a token that is not a JWT', () => {
    expect(jwtExpiry('opaque')).toBeUndefined()
  })

  it('returns undefined when exp is missing', () => {
    expect(jwtExpiry(fakeJwt({ sub: 'x' }))).toBeUndefined()
  })
})

describe('bearerToken', () => {
  it('returns the id_token, never the access_token', () => {
    const idToken = fakeJwt({ exp: nowSec() + 3600 })
    const user = { id_token: idToken, access_token: 'access' }
    expect(bearerToken(user)).toBe(idToken)
  })

  it('returns null when only an access_token is present', () => {
    const user: { id_token?: string; access_token: string } = { access_token: 'access' }
    expect(bearerToken(user)).toBeNull()
  })

  it('uses the ID token exp claim over the access token expires_at', () => {
    const expiredIdToken = fakeJwt({ exp: nowSec() - 60 })
    expect(bearerToken({ id_token: expiredIdToken, expires_at: nowSec() + 3600 })).toBeNull()
    const validIdToken = fakeJwt({ exp: nowSec() + 3600 })
    expect(bearerToken({ id_token: validIdToken, expires_at: nowSec() - 60 })).toBe(validIdToken)
  })
})

describe('readStoredToken', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('returns null when sessionStorage is empty', () => {
    expect(readStoredToken()).toBeNull()
  })

  it('returns the id_token from a valid oidc.user entry', () => {
    const idToken = fakeJwt({ exp: nowSec() + 3600 })
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id_token: idToken, access_token: 'access-token', expires_at: nowSec() + 3600 }),
    )
    expect(readStoredToken()).toBe(idToken)
  })

  it('returns null when the stored ID token is expired', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id_token: fakeJwt({ exp: nowSec() - 60 }), expires_at: nowSec() + 3600 }),
    )
    expect(readStoredToken()).toBeNull()
  })

  it('falls back to expires_at when the ID token has no exp claim', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id_token: fakeJwt({ sub: 'x' }), expires_at: nowSec() - 60 }),
    )
    expect(readStoredToken()).toBeNull()
  })

  it('returns null when id_token is missing from the stored entry', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access_token: 'access-token', expires_at: nowSec() + 3600 }),
    )
    expect(readStoredToken()).toBeNull()
  })

  it('returns null when the stored JSON is malformed', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-json')
    expect(readStoredToken()).toBeNull()
  })
})
