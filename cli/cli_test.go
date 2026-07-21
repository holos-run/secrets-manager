package cli

import (
	"testing"
	"time"
)

func TestDeriveOrigin(t *testing.T) {
	tests := []struct {
		name       string
		listenAddr string
		origin     string
		plainHTTP  bool
		want       string
	}{
		{
			name:       "explicit origin takes precedence",
			listenAddr: ":8443",
			origin:     "https://secrets-manager.home.jeffmccune.com",
			want:       "https://secrets-manager.home.jeffmccune.com",
		},
		{
			name:       "derive from port-only listen",
			listenAddr: ":4443",
			origin:     "",
			want:       "https://localhost:4443",
		},
		{
			name:       "derive from full listen address",
			listenAddr: "localhost:9000",
			origin:     "",
			want:       "https://localhost:9000",
		},
		{
			name:       "0.0.0.0 becomes localhost",
			listenAddr: "0.0.0.0:8443",
			origin:     "",
			want:       "https://localhost:8443",
		},
		{
			name:       "plain http derive",
			listenAddr: ":8080",
			origin:     "",
			plainHTTP:  true,
			want:       "http://localhost:8080",
		},
		{
			name:       "plain http explicit origin unchanged",
			listenAddr: ":8080",
			origin:     "https://secrets-manager.example.com",
			plainHTTP:  true,
			want:       "https://secrets-manager.example.com",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := deriveOrigin(tt.listenAddr, tt.origin, tt.plainHTTP)
			if got != tt.want {
				t.Errorf("deriveOrigin() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDeriveIssuer(t *testing.T) {
	tests := []struct {
		name       string
		listenAddr string
		issuer     string
		plainHTTP  bool
		want       string
	}{
		{
			name:       "explicit issuer takes precedence",
			listenAddr: ":8443",
			issuer:     "https://console.example.com/dex",
			want:       "https://console.example.com/dex",
		},
		{
			name:       "derive from port-only listen",
			listenAddr: ":4443",
			issuer:     "",
			want:       "https://localhost:4443/dex",
		},
		{
			name:       "derive from full listen address",
			listenAddr: "localhost:9000",
			issuer:     "",
			want:       "https://localhost:9000/dex",
		},
		{
			name:       "0.0.0.0 becomes localhost",
			listenAddr: "0.0.0.0:8443",
			issuer:     "",
			want:       "https://localhost:8443/dex",
		},
		{
			name:       "plain http derive",
			listenAddr: ":8080",
			issuer:     "",
			plainHTTP:  true,
			want:       "http://localhost:8080/dex",
		},
		{
			name:       "plain http explicit issuer unchanged",
			listenAddr: ":8080",
			issuer:     "https://holos.example.com/dex",
			plainHTTP:  true,
			want:       "https://holos.example.com/dex",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := deriveIssuer(tt.listenAddr, tt.issuer, tt.plainHTTP)
			if got != tt.want {
				t.Errorf("deriveIssuer() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPlatformRoleFlagsRemoved(t *testing.T) {
	cmd := Command()
	for _, flag := range []string{"platform-viewers", "platform-editors", "platform-owners", "namespace"} {
		t.Run(flag+" flag is removed", func(t *testing.T) {
			if f := cmd.Flags().Lookup(flag); f != nil {
				t.Fatalf("--%s flag should have been removed", flag)
			}
		})
	}
}

func TestDefaultNamespacePrefix(t *testing.T) {
	cmd := Command()
	f := cmd.Flags().Lookup("namespace-prefix")
	if f == nil {
		t.Fatal("--namespace-prefix flag not found")
	}
	if got := f.DefValue; got != "holos-" {
		t.Errorf("default namespace-prefix = %q, want %q", got, "holos-")
	}
}

func TestDefaultMetadataDomain(t *testing.T) {
	cmd := Command()
	f := cmd.Flags().Lookup("metadata-domain")
	if f == nil {
		t.Fatal("--metadata-domain flag not found")
	}
	if got := f.DefValue; got != "holos.run" {
		t.Errorf("default metadata-domain = %q, want %q", got, "holos.run")
	}
}

func TestDefaultAppName(t *testing.T) {
	cmd := Command()
	f := cmd.Flags().Lookup("app-name")
	if f == nil {
		t.Fatal("--app-name flag not found")
	}
	if got := f.DefValue; got != "Holos Secrets Manager" {
		t.Errorf("default app-name = %q, want %q", got, "Holos Secrets Manager")
	}
}

func TestCommandIdentity(t *testing.T) {
	cmd := Command()
	if got := cmd.Use; got != "secrets-manager" {
		t.Errorf("command use = %q, want %q", got, "secrets-manager")
	}
	if got := cmd.Short; got != "Holos Secrets Manager serves the secrets management web interface" {
		t.Errorf("command short description = %q, want Holos Secrets Manager description", got)
	}
}

func TestDefaultClientID(t *testing.T) {
	cmd := Command()
	f := cmd.Flags().Lookup("client-id")
	if f == nil {
		t.Fatal("--client-id flag not found")
	}
	if got := f.DefValue; got != "secrets-manager" {
		t.Errorf("default client-id = %q, want %q", got, "secrets-manager")
	}
}

func TestDefaultOrgCreatorRoles(t *testing.T) {
	cmd := Command()
	f := cmd.Flags().Lookup("org-creator-roles")
	if f == nil {
		t.Fatal("--org-creator-roles flag not found")
	}
	if got := f.DefValue; got != "owner" {
		t.Errorf("default org-creator-roles = %q, want %q", got, "owner")
	}
}

func TestDefaultRolesClaim(t *testing.T) {
	cmd := Command()
	f := cmd.Flags().Lookup("roles-claim")
	if f == nil {
		t.Fatal("--roles-claim flag not found")
	}
	if got := f.DefValue; got != "groups" {
		t.Errorf("default roles-claim = %q, want %q", got, "groups")
	}
}

func TestDefaultIDTokenTTL(t *testing.T) {
	cmd := Command()
	f := cmd.Flags().Lookup("id-token-ttl")
	if f == nil {
		t.Fatal("--id-token-ttl flag not found")
	}
	d, err := time.ParseDuration(f.DefValue)
	if err != nil {
		t.Fatalf("could not parse default id-token-ttl %q: %v", f.DefValue, err)
	}
	if d < time.Hour {
		t.Errorf("default id-token-ttl = %v, want >= 1h", d)
	}
}

func TestEnableInsecureDexDefault(t *testing.T) {
	cmd := Command()
	f := cmd.Flags().Lookup("enable-insecure-dex")
	if f == nil {
		t.Fatal("--enable-insecure-dex flag not found")
	}
	if got := f.DefValue; got != "false" {
		t.Errorf("default enable-insecure-dex = %q, want %q", got, "false")
	}
}

func TestTTLParsing(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    time.Duration
		wantErr bool
	}{
		{"15 minutes", "15m", 15 * time.Minute, false},
		{"1 hour", "1h", time.Hour, false},
		{"30 seconds", "30s", 30 * time.Second, false},
		{"12 hours", "12h", 12 * time.Hour, false},
		{"1 hour 30 minutes", "1h30m", 90 * time.Minute, false},
		{"500 milliseconds", "500ms", 500 * time.Millisecond, false},
		{"invalid", "invalid", 0, true},
		{"empty string", "", 0, true},
		{"negative", "-15m", -15 * time.Minute, false}, // ParseDuration allows negative
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := time.ParseDuration(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("time.ParseDuration(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("time.ParseDuration(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}
