import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from 'oidc-client-ts'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { tokenRef } from '@/lib/transport'

type Listener = (user: User) => void

const userLoadedListeners: Listener[] = []

const mockUserManager = {
  getUser: vi.fn(),
  signinSilent: vi.fn(),
  signinRedirect: vi.fn(),
  signoutRedirect: vi.fn(),
  events: {
    addUserLoaded: vi.fn((fn: Listener) => userLoadedListeners.push(fn)),
    removeUserLoaded: vi.fn((fn: Listener) => {
      const i = userLoadedListeners.indexOf(fn)
      if (i >= 0) userLoadedListeners.splice(i, 1)
    }),
    addUserUnloaded: vi.fn(),
    removeUserUnloaded: vi.fn(),
    addSilentRenewError: vi.fn(),
    removeSilentRenewError: vi.fn(),
  },
}

vi.mock('./userManager', () => ({
  getUserManager: () => mockUserManager,
}))

function fakeUser(idToken: string, accessToken: string): User {
  return {
    id_token: idToken,
    access_token: accessToken,
    expired: false,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    profile: { sub: 'user-1', iss: 'https://issuer', aud: 'secrets-manager', exp: 0, iat: 0 },
  } as unknown as User
}

function Probe() {
  const { getIdToken, refreshTokens } = useAuth()
  return (
    <>
      <div data-testid="id-token">{getIdToken() ?? 'none'}</div>
      <button onClick={() => void refreshTokens()}>refresh</button>
    </>
  )
}

describe('AuthProvider bearer token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userLoadedListeners.length = 0
    tokenRef.current = null
  })

  it('sets the transport bearer to the ID token, not the access token, on load', async () => {
    mockUserManager.getUser.mockResolvedValue(fakeUser('id-token-1', 'access-token-1'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(tokenRef.current).toBe('id-token-1'))
    expect(screen.getByTestId('id-token')).toHaveTextContent('id-token-1')
  })

  it('uses the refreshed ID token after a silent renew (userLoaded event)', async () => {
    mockUserManager.getUser.mockResolvedValue(fakeUser('id-token-1', 'access-token-1'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(tokenRef.current).toBe('id-token-1'))

    act(() => {
      userLoadedListeners.forEach((fn) => fn(fakeUser('id-token-2', 'access-token-2')))
    })
    await waitFor(() => expect(tokenRef.current).toBe('id-token-2'))
  })

  it('uses the refreshed ID token after refreshTokens()', async () => {
    mockUserManager.getUser.mockResolvedValue(fakeUser('id-token-1', 'access-token-1'))
    mockUserManager.signinSilent.mockResolvedValue(fakeUser('id-token-3', 'access-token-3'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(tokenRef.current).toBe('id-token-1'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    })
    await waitFor(() => expect(tokenRef.current).toBe('id-token-3'))
    expect(screen.getByTestId('id-token')).toHaveTextContent('id-token-3')
  })

  it('clears the bearer when there is no user', async () => {
    tokenRef.current = 'stale'
    mockUserManager.getUser.mockResolvedValue(null)
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(tokenRef.current).toBeNull())
  })
})
