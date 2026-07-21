package projects

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/holos-run/secrets-manager/console/resolver"
	"github.com/holos-run/secrets-manager/console/secrets"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// K8sClient wraps Kubernetes client operations for projects (namespaces).
type K8sClient struct {
	client   kubernetes.Interface
	Resolver *resolver.Resolver
}

// NewK8sClient creates a client for project operations.
func NewK8sClient(client kubernetes.Interface, r *resolver.Resolver) *K8sClient {
	return &K8sClient{client: client, Resolver: r}
}

// ListProjects returns all project namespaces. When org is non-empty, filters by organization.
func (c *K8sClient) ListProjects(ctx context.Context, org string) ([]*corev1.Namespace, error) {
	labelSelector := c.Resolver.ManagedByLabel() + "=" + c.Resolver.ManagedByValue() + "," +
		c.Resolver.ResourceTypeLabel() + "=" + resolver.ResourceTypeProject
	if org != "" {
		labelSelector += "," + c.Resolver.OrganizationLabel() + "=" + org
	}
	slog.DebugContext(ctx, "listing projects from kubernetes",
		slog.String("labelSelector", labelSelector),
	)
	list, err := c.client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return nil, err
	}
	result := make([]*corev1.Namespace, 0, len(list.Items))
	for i := range list.Items {
		if list.Items[i].DeletionTimestamp != nil {
			continue
		}
		if _, err := c.Resolver.ProjectFromNamespace(list.Items[i].Name); err != nil {
			var pme *resolver.PrefixMismatchError
			if errors.As(err, &pme) {
				slog.DebugContext(ctx, "filtering project namespace with prefix mismatch",
					slog.String("namespace", list.Items[i].Name),
					slog.String("reason", err.Error()),
				)
				continue
			}
		}
		result = append(result, &list.Items[i])
	}
	return result, nil
}

// GetProject retrieves a managed project namespace by name.
// The name is the user-facing project name (not the Kubernetes namespace).
func (c *K8sClient) GetProject(ctx context.Context, name string) (*corev1.Namespace, error) {
	nsName := c.Resolver.ProjectNamespace(name)
	slog.DebugContext(ctx, "getting project from kubernetes",
		slog.String("name", name),
		slog.String("namespace", nsName),
	)
	ns, err := c.client.CoreV1().Namespaces().Get(ctx, nsName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	if ns.Labels == nil || ns.Labels[c.Resolver.ManagedByLabel()] != c.Resolver.ManagedByValue() {
		return nil, fmt.Errorf("namespace %q is not managed by %s", nsName, c.Resolver.ManagedByValue())
	}
	if ns.Labels[c.Resolver.ResourceTypeLabel()] != resolver.ResourceTypeProject {
		return nil, fmt.Errorf("namespace %q is not a project", nsName)
	}
	return ns, nil
}

// CreateProject creates a new namespace with managed-by and resource-type labels.
func (c *K8sClient) CreateProject(ctx context.Context, name, displayName, description, org string, shareUsers, shareRoles []secrets.AnnotationGrant) (*corev1.Namespace, error) {
	nsName := c.Resolver.ProjectNamespace(name)
	slog.DebugContext(ctx, "creating project in kubernetes",
		slog.String("name", name),
		slog.String("namespace", nsName),
	)
	usersJSON, err := json.Marshal(shareUsers)
	if err != nil {
		return nil, fmt.Errorf("marshaling share-users: %w", err)
	}
	rolesJSON, err := json.Marshal(shareRoles)
	if err != nil {
		return nil, fmt.Errorf("marshaling share-roles: %w", err)
	}
	annotations := map[string]string{
		c.Resolver.ShareUsersAnnotation(): string(usersJSON),
		c.Resolver.ShareRolesAnnotation(): string(rolesJSON),
	}
	if displayName != "" {
		annotations[c.Resolver.DisplayNameAnnotation()] = displayName
	}
	if description != "" {
		annotations[c.Resolver.DescriptionAnnotation()] = description
	}
	labels := map[string]string{
		c.Resolver.ManagedByLabel():    c.Resolver.ManagedByValue(),
		c.Resolver.ResourceTypeLabel(): resolver.ResourceTypeProject,
		c.Resolver.ProjectLabel():      name,
	}
	if org != "" {
		labels[c.Resolver.OrganizationLabel()] = org
	}
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:        nsName,
			Labels:      labels,
			Annotations: annotations,
		},
	}
	return c.client.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
}

// UpdateProject updates the description and display name annotations on a managed namespace.
// Nil pointers preserve existing values.
func (c *K8sClient) UpdateProject(ctx context.Context, name string, displayName, description *string) (*corev1.Namespace, error) {
	slog.DebugContext(ctx, "updating project in kubernetes",
		slog.String("name", name),
	)
	ns, err := c.GetProject(ctx, name)
	if err != nil {
		return nil, err
	}
	if ns.Annotations == nil {
		ns.Annotations = make(map[string]string)
	}
	if displayName != nil {
		if *displayName == "" {
			delete(ns.Annotations, c.Resolver.DisplayNameAnnotation())
		} else {
			ns.Annotations[c.Resolver.DisplayNameAnnotation()] = *displayName
		}
	}
	if description != nil {
		if *description == "" {
			delete(ns.Annotations, c.Resolver.DescriptionAnnotation())
		} else {
			ns.Annotations[c.Resolver.DescriptionAnnotation()] = *description
		}
	}
	return c.client.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
}

// DeleteProject deletes a managed project namespace.
// Returns an error if the namespace does not have the managed-by label.
func (c *K8sClient) DeleteProject(ctx context.Context, name string) error {
	slog.DebugContext(ctx, "deleting project from kubernetes",
		slog.String("name", name),
	)
	// Verify the namespace is managed before deleting.
	ns, err := c.GetProject(ctx, name)
	if err != nil {
		return err
	}
	return c.client.CoreV1().Namespaces().Delete(ctx, ns.Name, metav1.DeleteOptions{})
}

// UpdateProjectSharing updates the sharing annotations on a managed namespace.
func (c *K8sClient) UpdateProjectSharing(ctx context.Context, name string, shareUsers, shareRoles []secrets.AnnotationGrant) (*corev1.Namespace, error) {
	slog.DebugContext(ctx, "updating project sharing in kubernetes",
		slog.String("name", name),
	)
	ns, err := c.GetProject(ctx, name)
	if err != nil {
		return nil, err
	}
	if ns.Annotations == nil {
		ns.Annotations = make(map[string]string)
	}
	usersJSON, err := json.Marshal(shareUsers)
	if err != nil {
		return nil, fmt.Errorf("marshaling share-users: %w", err)
	}
	rolesJSON, err := json.Marshal(shareRoles)
	if err != nil {
		return nil, fmt.Errorf("marshaling share-roles: %w", err)
	}
	ns.Annotations[c.Resolver.ShareUsersAnnotation()] = string(usersJSON)
	ns.Annotations[c.Resolver.ShareRolesAnnotation()] = string(rolesJSON)
	return c.client.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
}

// GetOrganization returns the organization label value from a namespace.
func GetOrganization(r *resolver.Resolver, ns *corev1.Namespace) string {
	if ns.Labels == nil {
		return ""
	}
	return ns.Labels[r.OrganizationLabel()]
}

// GetDisplayName returns the display-name annotation value from a namespace.
func GetDisplayName(r *resolver.Resolver, ns *corev1.Namespace) string {
	if ns.Annotations == nil {
		return ""
	}
	return ns.Annotations[r.DisplayNameAnnotation()]
}

// GetDescription returns the description annotation value from a namespace.
func GetDescription(r *resolver.Resolver, ns *corev1.Namespace) string {
	if ns.Annotations == nil {
		return ""
	}
	return ns.Annotations[r.DescriptionAnnotation()]
}

// GetShareUsers parses the share-users annotation from a namespace.
func GetShareUsers(r *resolver.Resolver, ns *corev1.Namespace) ([]secrets.AnnotationGrant, error) {
	return parseGrantAnnotation(ns, r.ShareUsersAnnotation())
}

// GetShareRoles parses the share-roles annotation from a namespace.
// Returns nil if the annotation is absent.
func GetShareRoles(r *resolver.Resolver, ns *corev1.Namespace) ([]secrets.AnnotationGrant, error) {
	return parseGrantAnnotation(ns, r.ShareRolesAnnotation())
}

// GetDefaultShareUsers parses the default-share-users annotation from a namespace.
// Returns nil if the annotation is absent.
func GetDefaultShareUsers(r *resolver.Resolver, ns *corev1.Namespace) ([]secrets.AnnotationGrant, error) {
	return parseGrantAnnotation(ns, r.DefaultShareUsersAnnotation())
}

// GetDefaultShareRoles parses the default-share-roles annotation from a namespace.
// Returns nil if the annotation is absent.
func GetDefaultShareRoles(r *resolver.Resolver, ns *corev1.Namespace) ([]secrets.AnnotationGrant, error) {
	return parseGrantAnnotation(ns, r.DefaultShareRolesAnnotation())
}

// UpdateProjectDefaultSharing updates the default sharing annotations on a managed namespace.
func (c *K8sClient) UpdateProjectDefaultSharing(ctx context.Context, name string, defaultUsers, defaultRoles []secrets.AnnotationGrant) (*corev1.Namespace, error) {
	slog.DebugContext(ctx, "updating project default sharing in kubernetes",
		slog.String("name", name),
	)
	ns, err := c.GetProject(ctx, name)
	if err != nil {
		return nil, err
	}
	if ns.Annotations == nil {
		ns.Annotations = make(map[string]string)
	}
	usersJSON, err := json.Marshal(defaultUsers)
	if err != nil {
		return nil, fmt.Errorf("marshaling default-share-users: %w", err)
	}
	rolesJSON, err := json.Marshal(defaultRoles)
	if err != nil {
		return nil, fmt.Errorf("marshaling default-share-roles: %w", err)
	}
	ns.Annotations[c.Resolver.DefaultShareUsersAnnotation()] = string(usersJSON)
	ns.Annotations[c.Resolver.DefaultShareRolesAnnotation()] = string(rolesJSON)
	return c.client.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
}

func parseGrantAnnotation(ns *corev1.Namespace, key string) ([]secrets.AnnotationGrant, error) {
	if ns.Annotations == nil {
		return nil, nil
	}
	value, ok := ns.Annotations[key]
	if !ok {
		return nil, nil
	}
	var grants []secrets.AnnotationGrant
	if err := json.Unmarshal([]byte(value), &grants); err != nil {
		return nil, fmt.Errorf("invalid %s annotation: %w", key, err)
	}
	return grants, nil
}
