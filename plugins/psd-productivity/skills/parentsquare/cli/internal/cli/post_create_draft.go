// Copyright 2026 Kris Hagel and contributors. Licensed under Apache-2.0. See LICENSE.
//
// Hand-authored write command. ParentSquare posts are created via
// POST /api/v2/districts/{id}/feeds. This command ALWAYS sets
// publish_option=DRAFT and zeroes every recipient include, so it can only ever
// create an unsent draft — it cannot notify anyone. There is intentionally no
// "send" path here. Verified against a real captured autosave request.

package cli

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/spf13/cobra"
)

func newCreateDraftCmd(flags *rootFlags) *cobra.Command {
	var subject, message string
	var confirm bool

	cmd := &cobra.Command{
		Use:   "create-draft <district_id>",
		Short: "Create an unsent DRAFT post (publish_option forced to DRAFT — never notifies)",
		Long: strings.Trim(`
Create a draft post in a district feed.

Safety: the post is ALWAYS a draft. publish_option is hard-forced to DRAFT and
every recipient include (parents/staff/students/guests) is set to 0, so it
notifies no one. It lands in the district's Drafts for a human to review and
post from the ParentSquare UI. This CLI deliberately has no "send" path.

Dry-run by default; pass --confirm to actually create the draft.`, "\n"),
		Example: strings.Trim(`
  parentsquare-pp-cli create-draft 998 --subject "Photo day" --message "<p>Friday.</p>"
  parentsquare-pp-cli create-draft 998 --subject "Photo day" --message "<p>Friday.</p>" --confirm`, "\n"),
		Annotations: map[string]string{"mcp:hidden": "true"},
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				return cmd.Help()
			}
			id := args[0]
			if strings.TrimSpace(subject) == "" || strings.TrimSpace(message) == "" {
				return usageErr(fmt.Errorf("--subject and --message are required"))
			}

			c, err := flags.newClient()
			if err != nil {
				return err
			}

			// CSRF token from a district page's <meta name="csrf-token">.
			html, _, err := c.GetRaw(cmd.Context(), "/districts/"+id, nil)
			if err != nil {
				return fmt.Errorf("fetching CSRF page: %w", err)
			}
			doc, err := goquery.NewDocumentFromReader(bytes.NewReader(html))
			if err != nil {
				return fmt.Errorf("parsing CSRF page: %w", err)
			}
			csrf, _ := doc.Find(`meta[name="csrf-token"]`).Attr("content")
			if strings.TrimSpace(csrf) == "" {
				return fmt.Errorf("csrf-token meta not found; is the session authenticated? (run: auth login --chrome)")
			}

			feed := map[string]any{
				"subject":          subject,
				"description":      message,
				"publish_option":   "DRAFT", // forced — never sends
				"autosaved":        "false",
				"include_parents":  "0",
				"include_staff":    "0",
				"include_students": "0",
				"include_guests":   "0",
				"feed_translations_attributes": map[string]any{
					"0": map[string]any{"language": "en", "subject": subject, "description": message},
				},
			}
			body := map[string]any{
				"utf8":               "✓",
				"authenticity_token": csrf,
				"auto_draft":         "false",
				"district_id":        id,
				"level_ids":          "",
				"languages":          "en",
				"feed":               feed,
			}
			path := "/api/v2/districts/" + id + "/feeds"

			if !confirm || dryRunOK(flags) {
				preview := map[string]any{
					"method":         "POST",
					"path":           path,
					"publish_option": "DRAFT (forced — no notification)",
					"recipients":     "none (all includes = 0)",
					"feed":           feed,
				}
				pj, _ := json.MarshalIndent(preview, "", "  ")
				fmt.Fprintln(cmd.OutOrStdout(), string(pj))
				fmt.Fprintln(cmd.ErrOrStderr(), "\n(dry run — nothing created. Re-run with --confirm to create the draft.)")
				return nil
			}

			resp, status, err := c.PostWithHeaders(cmd.Context(), path, body, map[string]string{"X-CSRF-Token": csrf})
			if err != nil {
				return classifyAPIError(err, flags)
			}
			fmt.Fprintf(cmd.ErrOrStderr(), "created DRAFT (HTTP %d) — review and post it from ParentSquare > Drafts\n", status)
			return printOutputWithFlags(cmd.OutOrStdout(), resp, flags)
		},
	}
	cmd.Flags().StringVar(&subject, "subject", "", "Draft subject (required)")
	cmd.Flags().StringVar(&message, "message", "", "Draft body HTML (required)")
	cmd.Flags().BoolVar(&confirm, "confirm", false, "Actually create the draft (default: dry-run)")
	return cmd
}
