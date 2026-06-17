// Copyright 2026 Kris Hagel and contributors. Licensed under Apache-2.0. See LICENSE.
//
// Hand-authored command (not generated): ParentSquare's Notifications Activity
// report is a server-rendered HTML table with no JSON/CSV API, so this command
// fetches the page (cookie auth) and parses the data table into structured rows.

package cli

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/spf13/cobra"
)

func newNotificationActivityCmd(flags *rootFlags) *cobra.Command {
	var scope, section, resource, startDate, endDate string

	sectionMap := map[string]string{"school-usage": "activity", "staff-usage": "usage", "recipients": "channel"}
	resourceMap := map[string]string{"posts": "Posts", "direct-messages": "Chat Messages", "alerts": "Alerts", "auto-notices": "Auto Notices", "secure-documents": "Secure Documents"}

	cmd := &cobra.Command{
		Use:   "notification-activity <id>",
		Short: "Notification activity (Posts/DMs/Alerts/Auto Notices/Secure Documents) by school, staff, or channel",
		Long: strings.Trim(`
Fetch ParentSquare's Notifications Activity report and return it as structured rows.

The report is server-rendered HTML with three sections (tabs):
  school-usage  per-school counts (default)
  staff-usage   per-staff counts
  recipients    per-channel recipient reach

Drill into one school with --scope school <school_id>. Filter the date window
with --start-date / --end-date (default: last 30 days) and the message type with
--resource.`, "\n"),
		Example: strings.Trim(`
  parentsquare-pp-cli notification-activity 998 --section school-usage --json
  parentsquare-pp-cli notification-activity 998 --section recipients
  parentsquare-pp-cli notification-activity 12078 --scope school --section school-usage
  parentsquare-pp-cli notification-activity 998 --resource posts --start-date 2026-05-01 --end-date 2026-05-31`, "\n"),
		Annotations: map[string]string{"mcp:read-only": "true"},
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 && cmd.Flags().NFlag() == 0 {
				return cmd.Help()
			}
			if len(args) == 0 {
				return usageErr(fmt.Errorf("missing required <id> (district id, or school id with --scope school)"))
			}
			id := args[0]

			sec, ok := sectionMap[section]
			if !ok {
				return usageErr(fmt.Errorf("--section must be one of: school-usage, staff-usage, recipients"))
			}
			base := "/districts/"
			switch scope {
			case "district":
			case "school":
				base = "/schools/"
			default:
				return usageErr(fmt.Errorf("--scope must be 'district' or 'school'"))
			}
			if endDate == "" {
				endDate = time.Now().Format("2006-01-02")
			}
			if startDate == "" {
				startDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
			}

			params := map[string]string{"section": sec, "start_date": startDate, "end_date": endDate}
			if resource != "" {
				rv, ok := resourceMap[resource]
				if !ok {
					return usageErr(fmt.Errorf("--resource must be one of: posts, direct-messages, alerts, auto-notices, secure-documents"))
				}
				params["resource"] = rv
			}
			path := base + id + "/notification_analytics"

			if dryRunOK(flags) {
				fmt.Fprintf(cmd.OutOrStdout(), "would GET %s (section=%s, %s..%s)\n", path, sec, startDate, endDate)
				return nil
			}

			c, err := flags.newClient()
			if err != nil {
				return err
			}
			html, _, err := c.GetRaw(cmd.Context(), path, params)
			if err != nil {
				return classifyAPIError(err, flags)
			}
			rows, err := parseNotificationActivityTable(html)
			if err != nil {
				return err
			}
			data, err := json.Marshal(rows)
			if err != nil {
				return err
			}
			return printOutputWithFlags(cmd.OutOrStdout(), data, flags)
		},
	}
	cmd.Flags().StringVar(&scope, "scope", "district", "Scope: district | school (school = drill into one school)")
	cmd.Flags().StringVar(&section, "section", "school-usage", "Section: school-usage | staff-usage | recipients")
	cmd.Flags().StringVar(&resource, "resource", "", "Resource filter: posts | direct-messages | alerts | auto-notices | secure-documents")
	cmd.Flags().StringVar(&startDate, "start-date", "", "Start date YYYY-MM-DD (default: 30 days ago)")
	cmd.Flags().StringVar(&endDate, "end-date", "", "End date YYYY-MM-DD (default: today)")
	return cmd
}

// parseNotificationActivityTable extracts the data table from the rendered
// Notifications Activity page. DataTables splits header and body into separate
// <table> elements, so headers come from the first thead with <th> cells and
// rows from the first table whose tbody has rows; cells map to headers by index.
func parseNotificationActivityTable(htmlBytes []byte) ([]map[string]string, error) {
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(htmlBytes))
	if err != nil {
		return nil, fmt.Errorf("parsing HTML: %w", err)
	}

	var headers []string
	doc.Find("table thead").EachWithBreak(func(_ int, th *goquery.Selection) bool {
		cells := th.Find("th")
		if cells.Length() == 0 {
			return true
		}
		cells.Each(func(_ int, csel *goquery.Selection) {
			headers = append(headers, strings.TrimSpace(csel.Text()))
		})
		return false
	})

	var dataTable *goquery.Selection
	doc.Find("table").EachWithBreak(func(_ int, t *goquery.Selection) bool {
		if t.Find("tbody tr").Length() > 0 {
			dataTable = t
			return false
		}
		return true
	})

	rows := []map[string]string{}
	if dataTable == nil {
		return rows, nil
	}
	dataTable.Find("tbody tr").Each(func(_ int, tr *goquery.Selection) {
		row := map[string]string{}
		tr.Find("td").Each(func(j int, td *goquery.Selection) {
			key := fmt.Sprintf("col_%d", j)
			if j < len(headers) && headers[j] != "" {
				key = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(headers[j]), " ", "_"))
			}
			row[key] = strings.TrimSpace(td.Text())
		})
		if len(row) > 0 {
			rows = append(rows, row)
		}
	})
	return rows, nil
}
