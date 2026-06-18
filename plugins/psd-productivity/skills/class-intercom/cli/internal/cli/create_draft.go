// Copyright 2026 Kris Hagel and contributors. Licensed under Apache-2.0. See LICENSE.
//
// Hand-authored write command. Class Intercom posts are created via
// POST /api/compose-v2/submit_new. This command ALWAYS sets state="save_draft"
// (never "publish" or "schedule"), so it can only create an unsent draft that a
// human reviews and posts from the Class Intercom UI. Verified against a real
// captured save-draft request.

package cli

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"classintercom-pp-cli/internal/client"

	"github.com/spf13/cobra"
)

// Class Intercom is a Rails app that enforces CSRF on non-GET /api requests.
// The token is published in a <meta name="csrf-token" content="..."> tag on any
// server-rendered app page and must be echoed back in the X-CSRF-Token header.
var (
	csrfMetaRe    = regexp.MustCompile(`(?i)<meta[^>]*name=["']csrf-token["'][^>]*>`)
	csrfContentRe = regexp.MustCompile(`(?i)content=["']([^"']+)["']`)
)

// fetchCSRFToken pulls the Rails CSRF token from an app page using the same
// authenticated session as the write, so the token is valid for that session.
func fetchCSRFToken(ctx context.Context, c *client.Client) (string, error) {
	raw, err := c.GetWithHeadersNoCache(ctx, "/app/dashboard", nil, map[string]string{"Accept": "text/html"})
	if err != nil {
		return "", fmt.Errorf("fetching CSRF token page: %w", err)
	}
	tag := csrfMetaRe.Find(raw)
	if tag == nil {
		return "", fmt.Errorf("no <meta name=\"csrf-token\"> found on /app/dashboard (is the session still valid? re-run `auth login --chrome`)")
	}
	m := csrfContentRe.FindSubmatch(tag)
	if m == nil || len(m) < 2 {
		return "", fmt.Errorf("csrf-token meta tag has no content attribute")
	}
	return string(m[1]), nil
}

// newUUIDv4 returns a random RFC-4122 v4 UUID. Class Intercom's composer mints a
// fresh assignment_id (a v4 UUID) per draft client-side — there is no server
// call that issues it — so the CLI generates one the same way.
func newUUIDv4() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10xx
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16]), nil
}

func newCreateDraftCmd(flags *rootFlags) *cobra.Command {
	var channels []string
	var message string
	var confirm bool

	cmd := &cobra.Command{
		Use:   "create-draft",
		Short: "Create an unsent DRAFT post (state forced to save_draft — never publishes/schedules)",
		Long: strings.Trim(`
Create a draft social post in Class Intercom.

Safety: state is hard-forced to "save_draft" (not publish or schedule), so the
post is created as an unsent DRAFT and notifies/publishes nothing. It lands in
Class Intercom for a human to review and post. This CLI has no publish path.

Channels are UUIDs — get them from the "channels" command (the value field).
Dry-run by default; pass --confirm to actually create the draft.`, "\n"),
		Example: strings.Trim(`
  classintercom-pp-cli create-draft --channel 4d53b616-... --message "Photo day Friday!"
  classintercom-pp-cli create-draft --channel 4d53b616-... --channel fc90e4d4-... --message "Go Seahawks!" --confirm`, "\n"),
		Annotations: map[string]string{"mcp:hidden": "true"},
		RunE: func(cmd *cobra.Command, args []string) error {
			if strings.TrimSpace(message) == "" || len(channels) == 0 {
				return usageErr(fmt.Errorf("--message and at least one --channel (a UUID from the `channels` command) are required"))
			}

			// Tiptap/ProseMirror doc mirroring the plain text, matching the composer.
			msgDoc := map[string]any{
				"type": "doc",
				"content": []any{
					map[string]any{
						"type":    "paragraph",
						"content": []any{map[string]any{"type": "text", "text": message}},
					},
				},
			}
			content := map[string]any{
				"social_channels": map[string]any{"channels": channels},
				"destinations":    map[string]any{"destination_ids": []string{}},
				"social_message":  map[string]any{"text": message, "json": msgDoc},
				"media":           map[string]any{"assets": []any{}},
				"links":           []any{},
				// schedule fields are the composer's UI defaults; ignored while
				// state=save_draft (which is what makes this a draft, not a publish).
				"schedule":   map[string]any{"scheduled_at": nil, "publish_immediately": "1", "valid_from": nil, "valid_to": nil},
				"tags":       map[string]any{"tag_ids": []string{}},
				"notes":      []any{},
				"publishing": map[string]any{"publication_method": "api", "notification_target_id": nil},
			}
			assignmentID, err := newUUIDv4()
			if err != nil {
				return err
			}
			body := map[string]any{
				"type":          "post",
				"state":         "save_draft", // forced — never publishes or schedules
				"content":       content,
				"assignment_id": assignmentID,
			}
			const path = "/api/compose-v2/submit_new"

			if !confirm || dryRunOK(flags) {
				pj, _ := json.MarshalIndent(map[string]any{"method": "POST", "path": path, "state": "save_draft (forced)", "body": body}, "", "  ")
				fmt.Fprintln(cmd.OutOrStdout(), string(pj))
				fmt.Fprintln(cmd.ErrOrStderr(), "\n(dry run — nothing created. Re-run with --confirm to create the draft.)")
				return nil
			}

			c, err := flags.newClient()
			if err != nil {
				return err
			}
			token, err := fetchCSRFToken(cmd.Context(), c)
			if err != nil {
				return err
			}
			resp, status, err := c.PostWithHeaders(cmd.Context(), path, body, map[string]string{"X-CSRF-Token": token})
			if err != nil {
				return classifyAPIError(err, flags)
			}
			fmt.Fprintf(cmd.ErrOrStderr(), "created DRAFT (HTTP %d) — review and post it from Class Intercom\n", status)
			return printOutputWithFlags(cmd.OutOrStdout(), resp, flags)
		},
	}
	cmd.Flags().StringArrayVar(&channels, "channel", nil, "Channel UUID to post to (repeatable; from the `channels` command)")
	cmd.Flags().StringVar(&message, "message", "", "Draft message text (required)")
	cmd.Flags().BoolVar(&confirm, "confirm", false, "Actually create the draft (default: dry-run)")
	return cmd
}
