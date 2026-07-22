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
	}, AppConfig{AppName: "Secrets"}))

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
				"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
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

			matches := regexp.MustCompile(`script-src 'self' 'nonce-([^']+)'`).FindStringSubmatch(csp)
			if len(matches) != 2 || matches[1] == "" {
				t.Fatalf("Content-Security-Policy has no script nonce: %q", csp)
			}
			nonce := matches[1]
			if test.path == "/" {
				body := rec.Body.String()
				if count := strings.Count(body, `nonce="`+nonce+`"`); count != 2 {
					t.Errorf("HTML has %d config script nonce attributes, want 2: %s", count, body)
				}
			}
		})
	}
}

func TestSecurityHeadersOmitsHSTSForPlainHTTP(t *testing.T) {
	handler := securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "http://console.example.com/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Strict-Transport-Security"); got != "" {
		t.Errorf("Strict-Transport-Security = %q on plain HTTP, want empty", got)
	}
}

func TestSecurityHeadersUsesUniqueNonces(t *testing.T) {
	handler := securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

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
