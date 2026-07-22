# ADR 013: Enforce browser security headers

## Status

Accepted

## Context

The console serves the React application, ConnectRPC endpoints, health endpoints, metrics, and
the optional embedded Dex provider from one HTTP server. None of those responses previously
included browser hardening headers. The application shell also contains two runtime-generated
inline scripts for OIDC and product configuration, so a policy that simply blocks every inline
script would prevent the application from starting.

Some React and shadcn components use inline style attributes for dynamic dimensions and CSS
custom properties. Those values cannot use a CSP nonce in the same way as a script element.
Application scripts, fonts, stylesheets, API calls, and OIDC calls are otherwise served from the
console's own origin.

## Decision

Every response is wrapped by security-header middleware. It sets:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000` when the console receives the request over TLS
- an enforcing Content Security Policy with same-origin defaults, `frame-ancestors 'none'`,
  `object-src 'none'`, and `base-uri 'self'`

For an HTML application-shell response, the middleware supplies a lazy nonce generator and the UI
handler generates a fresh 128-bit random nonce. The UI handler adds that nonce to both runtime
configuration scripts, and `script-src` allows same-origin scripts plus only the matching nonce. It
does not allow `'unsafe-inline'` scripts. Non-HTML responses retain the same policy without an
unused nonce and do not consume randomness. Application-shell responses also set
`Cache-Control: no-store`, preventing shared or browser caches from replaying nonce-bearing HTML.
The UI handler fails closed if it is used without the security middleware that provides this
request context.

The policy allows `'unsafe-inline'` only in `style-src`. This deliberate allowance supports the
existing dynamic React style attributes and shadcn CSS custom properties without weakening script
execution. Images may use same-origin or `data:` URLs, while fonts and form actions remain
same-origin. Connections are same-origin by default. When the configured OIDC issuer has a
different origin from the console's public origin, only that parsed issuer origin is added to
`connect-src` so discovery, PKCE token exchange, user-info requests, and refreshes can complete.
Default HTTP and HTTPS ports are normalized when comparing origins. The optional embedded Dex login
is same-origin for these connections.

The middleware also applies the console CSP to embedded Dex HTML. Dex's development-only password
page contains an inline double-submit guard without a console-generated nonce, so a browser blocks
that guard while the native form login continues to work. This is an accepted, non-blocking
embedded-Dex limitation under ADR-008: embedded Dex is prohibited and unsupported in production.
The exception does not weaken the CSP for the production console or external OIDC providers, and
any CSP or OIDC finding affecting those production paths remains blocking.

HSTS is omitted on plain HTTP because browsers ignore it on insecure responses. Deployments that
terminate TLS before forwarding plain HTTP to the console must set HSTS at that TLS terminator. The
console does not assert `includeSubDomains` because it cannot determine whether sibling or child
hosts are HTTPS-only.

## Consequences

- Runtime configuration remains executable without permitting arbitrary inline scripts.
- Clickjacking, content sniffing, unnecessary browser capabilities, and referrer disclosure are
  restricted across the whole server.
- Inline styles remain an accepted, narrowly scoped CSP allowance; removing it requires replacing
  all dynamic style attributes and affected component-library behavior.
- Adding a cross-origin asset, API, identity flow, or form target requires an explicit policy
  decision rather than working implicitly.
