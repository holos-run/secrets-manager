package oidc_test

import (
	"testing"

	"github.com/holos-run/secrets-manager/console/oidc"
)

func TestGetPassword(t *testing.T) {
	// Test default password
	t.Setenv("HOLOS_DEX_INITIAL_ADMIN_PASSWORD", "")
	if got := oidc.GetPassword(); got != oidc.DefaultPassword {
		t.Errorf("GetPassword() = %q, want %q", got, oidc.DefaultPassword)
	}

	// Test environment variable override
	t.Setenv("HOLOS_DEX_INITIAL_ADMIN_PASSWORD", "custom-password")
	if got := oidc.GetPassword(); got != "custom-password" {
		t.Errorf("GetPassword() = %q, want %q", got, "custom-password")
	}
}

func TestGetUsername(t *testing.T) {
	// Test default username
	t.Setenv("HOLOS_DEX_INITIAL_ADMIN_USERNAME", "")
	if got := oidc.GetUsername(); got != oidc.DefaultUsername {
		t.Errorf("GetUsername() = %q, want %q", got, oidc.DefaultUsername)
	}

	// Test environment variable override
	t.Setenv("HOLOS_DEX_INITIAL_ADMIN_USERNAME", "custom-user")
	if got := oidc.GetUsername(); got != "custom-user" {
		t.Errorf("GetUsername() = %q, want %q", got, "custom-user")
	}
}

func TestDefaultValues(t *testing.T) {
	// Verify default constants are set
	if oidc.DefaultPassword == "" {
		t.Error("DefaultPassword is empty")
	}
	if oidc.DefaultUsername == "" {
		t.Error("DefaultUsername is empty")
	}
}
