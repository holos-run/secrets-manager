package console

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"testing/fstest"
)

func TestSecurityHeaders(t *testing.T) {
	uiContent := fstest.MapFS{
		"index.html":    {Data: []byte("<html><head><title>Holos Secrets Manager</title></head><body></body></html>")},
		"assets/app.js": {Data: []byte("console.log('loaded')")},
	}
	handler := securityHeaders(newUIHandler(uiContent, &OIDCConfig{
		Authority:             "https://console.example.com/dex",
		ClientID:              "secrets-manager",
		RedirectURI:           "https://console.example.com/pkce/verify",
		PostLogoutRedirectURI: "https://console.example.com/",
	}, AppConfig{AppName: "Secrets"}), "https://console.example.com", "https://console.example.com/dex")

	for _, test := range []struct {
		name        string
		path        string
		contentType string
	}{
		{name: "HTML", path: "/", contentType: "text/html; charset=utf-8"},
		{name: "asset", path: "/assets/app.js", contentType: "text/javascript; charset=utf-8"},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, test.path, nil)
			req.TLS = &tls.ConnectionState{}
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
			}
			wantHeaders := map[string]string{
				"Content-Type":              test.contentType,
				"X-Content-Type-Options":    "nosniff",
				"X-Frame-Options":           "DENY",
				"Referrer-Policy":           "no-referrer",
				"Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
				"Strict-Transport-Security": "max-age=31536000",
			}
			if test.path == "/" {
				wantHeaders["Cache-Control"] = "no-store"
			}
			for name, want := range wantHeaders {
				if got := rec.Header().Get(name); got != want {
					t.Errorf("%s = %q, want %q", name, got, want)
				}
			}

			csp := rec.Header().Get("Content-Security-Policy")
			for _, directive := range []string{
				"default-src 'self'",
				"base-uri 'self'",
				"object-src 'none'",
				"frame-ancestors 'none'",
				"connect-src 'self'",
				"font-src 'self'",
				"img-src 'self' data:",
				"style-src 'self' 'unsafe-inline'",
				"form-action 'self'",
			} {
				if !strings.Contains(csp, directive) {
					t.Errorf("Content-Security-Policy = %q, missing %q", csp, directive)
				}
			}
			if strings.Contains(csp, "script-src 'self' 'unsafe-inline'") {
				t.Errorf("Content-Security-Policy permits unsafe inline scripts: %q", csp)
			}

			if test.path == "/" {
				matches := regexp.MustCompile(`script-src 'self' 'nonce-([^']+)'`).FindStringSubmatch(csp)
				if len(matches) != 2 || matches[1] == "" {
					t.Fatalf("Content-Security-Policy has no script nonce: %q", csp)
				}
				nonce := matches[1]
				body := rec.Body.String()
				if count := strings.Count(body, `nonce="`+nonce+`"`); count != 2 {
					t.Errorf("HTML has %d config script nonce attributes, want 2: %s", count, body)
				}
			} else if strings.Contains(csp, "'nonce-") {
				t.Errorf("asset CSP contains an unused script nonce: %q", csp)
			}
		})
	}
}

func TestSecurityHeadersOmitsHSTSForPlainHTTP(t *testing.T) {
	handler := securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}), "http://console.example.com", "")
	req := httptest.NewRequest(http.MethodGet, "http://console.example.com/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Strict-Transport-Security"); got != "" {
		t.Errorf("Strict-Transport-Security = %q on plain HTTP, want empty", got)
	}
}

func TestSecurityHeadersUsesUniqueNonces(t *testing.T) {
	uiContent := fstest.MapFS{
		"index.html": {Data: []byte("<html><head><title>Secrets</title></head><body></body></html>")},
	}
	handler := securityHeaders(newUIHandler(uiContent, nil, AppConfig{}), "https://console.example.com", "")

	nonces := make(map[string]struct{})
	for range 2 {
		req := httptest.NewRequest(http.MethodGet, "https://console.example.com/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		matches := regexp.MustCompile(`script-src 'self' 'nonce-([^']+)'`).FindStringSubmatch(rec.Header().Get("Content-Security-Policy"))
		if len(matches) != 2 {
			t.Fatalf("Content-Security-Policy has no script nonce: %q", rec.Header().Get("Content-Security-Policy"))
		}
		nonces[matches[1]] = struct{}{}
	}
	if len(nonces) != 2 {
		t.Fatal("security header middleware reused a script nonce across requests")
	}
}

func TestSecurityHeadersAllowsExternalOIDCIssuerConnections(t *testing.T) {
	uiContent := fstest.MapFS{
		"index.html": {Data: []byte("<html><head><title>Secrets</title></head><body></body></html>")},
	}
	handler := securityHeaders(
		newUIHandler(uiContent, nil, AppConfig{}),
		"https://console.example.com",
		"https://identity.example.net/realms/holos",
	)
	req := httptest.NewRequest(http.MethodGet, "https://console.example.com/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	csp := rec.Header().Get("Content-Security-Policy")
	if !strings.Contains(csp, "connect-src 'self' https://identity.example.net") {
		t.Errorf("Content-Security-Policy does not allow the external OIDC origin: %q", csp)
	}
	if strings.Contains(csp, "/realms/holos") {
		t.Errorf("Content-Security-Policy must allow only the OIDC origin, not its path: %q", csp)
	}
}

func TestExternalOrigin(t *testing.T) {
	for _, test := range []struct {
		name          string
		consoleOrigin string
		issuer        string
		want          string
	}{
		{
			name:          "external issuer",
			consoleOrigin: "https://console.example.com",
			issuer:        "https://identity.example.net/realms/holos",
			want:          "https://identity.example.net",
		},
		{
			name:          "same origin",
			consoleOrigin: "https://console.example.com",
			issuer:        "https://console.example.com/dex",
		},
		{
			name:          "origin comparison is case insensitive",
			consoleOrigin: "https://console.example.com",
			issuer:        "HTTPS://CONSOLE.EXAMPLE.COM/dex",
		},
		{
			name:          "default HTTPS port is same origin",
			consoleOrigin: "https://console.example.com",
			issuer:        "https://console.example.com:443/dex",
		},
		{
			name:          "default HTTP port is same origin",
			consoleOrigin: "http://console.example.com:80",
			issuer:        "http://console.example.com/dex",
		},
		{
			name:          "credential-bearing issuer is rejected",
			consoleOrigin: "https://console.example.com",
			issuer:        "https://user:password@identity.example.net/realms/holos",
		},
		{
			name:          "non-http issuer is rejected",
			consoleOrigin: "https://console.example.com",
			issuer:        "javascript:alert(1)",
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := externalOrigin(test.consoleOrigin, test.issuer); got != test.want {
				t.Errorf("externalOrigin(%q, %q) = %q, want %q", test.consoleOrigin, test.issuer, got, test.want)
			}
		})
	}
}

func TestUIHandlerRequiresSecurityMiddleware(t *testing.T) {
	uiContent := fstest.MapFS{
		"index.html": {Data: []byte("<html><head><title>Secrets</title></head><body></body></html>")},
	}
	handler := newUIHandler(uiContent, nil, AppConfig{})
	req := httptest.NewRequest(http.MethodGet, "https://console.example.com/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}
