// Copyright 2026 Kris Hagel and contributors. Licensed under Apache-2.0. See LICENSE.
//
// Hand-authored dev helper (hidden): authenticated raw GET of an arbitrary path,
// used to inspect server-rendered pages (forms, CSRF tokens) when building
// hand-coded commands. Not part of the public surface.

package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newDebugFetchCmd(flags *rootFlags) *cobra.Command {
	cmd := &cobra.Command{
		Use:                "_fetch <path>",
		Short:              "Authenticated raw GET of a path (dev helper)",
		Hidden:             true,
		Annotations:        map[string]string{"mcp:hidden": "true"},
		DisableFlagParsing: false,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				return usageErr(fmt.Errorf("usage: _fetch <path>"))
			}
			c, err := flags.newClient()
			if err != nil {
				return err
			}
			body, status, err := c.GetRaw(cmd.Context(), args[0], nil)
			if err != nil {
				return err
			}
			fmt.Fprintf(cmd.ErrOrStderr(), "HTTP %d, %d bytes\n", status, len(body))
			fmt.Fprint(cmd.OutOrStdout(), string(body))
			return nil
		},
	}
	return cmd
}
