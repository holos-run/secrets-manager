// Package resolver translates user-facing resource names (organizations, projects)
// to Kubernetes namespace names using independently configurable prefixes for each
// resource type.
package resolver

import (
	"fmt"
	"strings"
)

const (
	// DefaultMetadataDomain is used for managed Kubernetes metadata when no
	// operator override is configured.
	DefaultMetadataDomain = "holos.run"
	// ResourceTypeOrganization is the resource-type label value for organization namespaces.
	ResourceTypeOrganization = "organization"
	// ResourceTypeProject is the resource-type label value for project namespaces.
	ResourceTypeProject = "project"
	managedByLabel      = "app.kubernetes.io/managed-by"
)

// Resolver translates between user-facing resource names and Kubernetes namespace names.
// Organization namespaces: {NamespacePrefix}{OrganizationPrefix}{name}
// Project namespaces: {NamespacePrefix}{ProjectPrefix}{name}
type Resolver struct {
	NamespacePrefix    string // default "holos-"
	OrganizationPrefix string // default "org-"
	ProjectPrefix      string // default "prj-"
	MetadataDomain     string // default "holos.run"
}

// MetadataDomainValue returns the configured Kubernetes metadata domain.
func (r *Resolver) MetadataDomainValue() string {
	if r.MetadataDomain == "" {
		return DefaultMetadataDomain
	}
	return r.MetadataDomain
}

func (r *Resolver) metadataKey(path string) string {
	return r.MetadataDomainValue() + "/" + path
}

// ResourceTypeLabel distinguishes organization and project namespaces.
func (r *Resolver) ResourceTypeLabel() string { return r.metadataKey("resource-type") }

// OrganizationLabel stores the organization name on organization and project namespaces.
func (r *Resolver) OrganizationLabel() string { return r.metadataKey("organization") }

// ProjectLabel stores the project name on project namespaces.
func (r *Resolver) ProjectLabel() string { return r.metadataKey("project") }

// DisplayNameAnnotation stores the human-readable resource name.
func (r *Resolver) DisplayNameAnnotation() string { return r.metadataKey("display-name") }

// DescriptionAnnotation stores the human-readable resource description.
func (r *Resolver) DescriptionAnnotation() string { return r.metadataKey("description") }

// URLAnnotation stores the URL associated with a secret.
func (r *Resolver) URLAnnotation() string { return r.metadataKey("url") }

// ShareUsersAnnotation stores per-user sharing grants.
func (r *Resolver) ShareUsersAnnotation() string { return r.metadataKey("share-users") }

// ShareRolesAnnotation stores per-role sharing grants.
func (r *Resolver) ShareRolesAnnotation() string { return r.metadataKey("share-roles") }

// DefaultShareUsersAnnotation stores project defaults for per-user grants.
func (r *Resolver) DefaultShareUsersAnnotation() string {
	return r.metadataKey("default-share-users")
}

// DefaultShareRolesAnnotation stores project defaults for per-role grants.
func (r *Resolver) DefaultShareRolesAnnotation() string {
	return r.metadataKey("default-share-roles")
}

// ManagedByLabel is the standard Kubernetes label key used for ownership.
func (r *Resolver) ManagedByLabel() string { return managedByLabel }

// ManagedByValue identifies resources managed for this metadata domain.
func (r *Resolver) ManagedByValue() string { return r.MetadataDomainValue() }

// OrgNamespace returns the Kubernetes namespace name for an organization.
func (r *Resolver) OrgNamespace(org string) string {
	return r.NamespacePrefix + r.OrganizationPrefix + org
}

// OrgFromNamespace extracts the organization name from a Kubernetes namespace name.
// Returns a *PrefixMismatchError when ns does not start with the expected prefix.
// Prefer the OrganizationLabel on the namespace when available.
func (r *Resolver) OrgFromNamespace(ns string) (string, error) {
	prefix := r.NamespacePrefix + r.OrganizationPrefix
	if !strings.HasPrefix(ns, prefix) {
		return "", &PrefixMismatchError{Namespace: ns, Prefix: prefix}
	}
	return strings.TrimPrefix(ns, prefix), nil
}

// ProjectNamespace returns the Kubernetes namespace name for a project.
func (r *Resolver) ProjectNamespace(project string) string {
	return r.NamespacePrefix + r.ProjectPrefix + project
}

// ProjectFromNamespace extracts the project name from a Kubernetes namespace name.
// Returns a *PrefixMismatchError when ns does not start with the expected prefix.
// Prefer the ProjectLabel on the namespace when available.
func (r *Resolver) ProjectFromNamespace(ns string) (string, error) {
	prefix := r.NamespacePrefix + r.ProjectPrefix
	if !strings.HasPrefix(ns, prefix) {
		return "", &PrefixMismatchError{Namespace: ns, Prefix: prefix}
	}
	return strings.TrimPrefix(ns, prefix), nil
}

// PrefixMismatchError is returned when a namespace name does not begin with
// the expected prefix for the resource type being resolved.
type PrefixMismatchError struct {
	Namespace string // the namespace name that was checked
	Prefix    string // the expected prefix that was not found
}

func (e *PrefixMismatchError) Error() string {
	return fmt.Sprintf("namespace %q does not match expected prefix %q", e.Namespace, e.Prefix)
}
