package console

import "testing"

func TestDeriveRedirectURI(t *testing.T) {
	tests := []struct {
		name   string
		origin string
		want   string
	}{
		{
			name:   "standard origin",
			origin: "https://secrets-manager.home.jeffmccune.com",
			want:   "https://secrets-manager.home.jeffmccune.com/pkce/verify",
		},
		{
			name:   "localhost origin",
			origin: "https://localhost:8443",
			want:   "https://localhost:8443/pkce/verify",
		},
		{
			name:   "trailing slash stripped",
			origin: "https://secrets-manager.example.com/",
			want:   "https://secrets-manager.example.com/pkce/verify",
		},
		{
			name:   "plain http origin",
			origin: "http://localhost:8080",
			want:   "http://localhost:8080/pkce/verify",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := deriveRedirectURI(tt.origin)
			if got != tt.want {
				t.Errorf("deriveRedirectURI() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDerivePostLogoutRedirectURI(t *testing.T) {
	tests := []struct {
		name   string
		origin string
		want   string
	}{
		{
			name:   "standard origin",
			origin: "https://secrets-manager.home.jeffmccune.com",
			want:   "https://secrets-manager.home.jeffmccune.com/",
		},
		{
			name:   "localhost origin",
			origin: "https://localhost:8443",
			want:   "https://localhost:8443/",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := derivePostLogoutRedirectURI(tt.origin)
			if got != tt.want {
				t.Errorf("derivePostLogoutRedirectURI() = %v, want %v", got, tt.want)
			}
		})
	}
}
