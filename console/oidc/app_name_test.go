package oidc

import "testing"

func TestClientDisplayName(t *testing.T) {
	if DefaultAppName != "Holos Secrets Manager" {
		t.Fatalf("DefaultAppName = %q, want %q", DefaultAppName, "Holos Secrets Manager")
	}

	tests := []struct {
		name    string
		appName string
		want    string
	}{
		{name: "default", want: DefaultAppName},
		{name: "override", appName: "Acme Secrets Manager", want: "Acme Secrets Manager"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := clientDisplayName(tt.appName); got != tt.want {
				t.Errorf("clientDisplayName(%q) = %q, want %q", tt.appName, got, tt.want)
			}
		})
	}
}
