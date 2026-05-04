---
name: psd-sign
description: Sign, notarize, and package a macOS .app into a .pkg for PSD Jamf Self Service deployment. Handles the full Apple Developer ID pipeline.
triggers:
  - "sign app"
  - "sign and package"
  - "notarize app"
  - "package for jamf"
  - "build pkg"
  - "psd-sign"
allowed-tools: Bash, Read
version: 0.1.0
---

# PSD macOS App Signing & Packaging

Sign, notarize, and package a macOS `.app` into a `.pkg` for deployment via Jamf Self Service.

## PSD Constants

These are embedded in the workflow and should not need to change unless PSD's Apple Developer account changes.

- **Team ID:** `87DL7L9GU6`
- **App Signing Identity:** `Developer ID Application: Peninsula School District (87DL7L9GU6)`
- **Installer Signing Identity:** `Developer ID Installer: Peninsula School District (87DL7L9GU6)`

## Prerequisites

- macOS with Xcode Command Line Tools installed
- PSD Developer ID certificates installed on the machine (both Application and Installer)
- An Apple ID that is a member of the PSD Apple Developer account
- An app-specific password for that Apple ID (generate at https://appleid.apple.com)
- A built `.app` bundle ready for signing

## Workflow

When invoked, collect the following from the user before proceeding:

1. **App path** — full path to the `.app` bundle (may be provided as an argument)
2. **Apple ID** — the `@psd401.net` account with Developer ID access
3. **App-specific password** — SECURITY: never log, echo, or store this value
4. **Version number** — semver string for the package (e.g., `1.0.0`)
5. **Bundle identifier** — defaults to `net.psd401.<appname-lowercase>`

Confirm the configuration with the user, then run each step sequentially. Stop immediately on any failure and report the error.

### Step 1: Remove quarantine

Remove macOS quarantine extended attributes that would interfere with signing.

```bash
xattr -cr "$APP_PATH"
```

### Step 2: Sign with Developer ID

Deep-sign the app bundle with hardened runtime for notarization compatibility.

```bash
codesign --deep --force --options runtime \
  --sign "Developer ID Application: Peninsula School District (87DL7L9GU6)" \
  "$APP_PATH"
```

### Step 3: Zip for notarization

Create a zip archive for submission to Apple's notary service.

```bash
ditto -c -k --keepParent "$APP_PATH" "/tmp/${APP_NAME}.zip"
```

### Step 4: Notarize the .app

Submit to Apple's notary service and wait for approval. This typically takes 2-10 minutes.

```bash
xcrun notarytool submit "/tmp/${APP_NAME}.zip" \
  --apple-id "$APPLE_ID" \
  --team-id 87DL7L9GU6 \
  --password "$APP_PASSWORD" \
  --wait
```

### Step 5: Staple the .app

Attach the notarization ticket to the app so it works offline.

```bash
xcrun stapler staple "$APP_PATH"
```

### Step 6: Build the .pkg

Package the signed, notarized app into an installer package for Jamf.

```bash
PAYLOAD_DIR=$(mktemp -d)
mkdir -p "$PAYLOAD_DIR/Applications"
cp -R "$APP_PATH" "$PAYLOAD_DIR/Applications/"
pkgbuild \
  --root "$PAYLOAD_DIR" \
  --identifier "$PKG_ID" \
  --version "$VERSION" \
  --install-location "/" \
  --sign "Developer ID Installer: Peninsula School District (87DL7L9GU6)" \
  "$HOME/Desktop/${APP_NAME}.pkg"
rm -rf "$PAYLOAD_DIR"
```

### Step 7: Notarize the .pkg

Submit the installer package to Apple's notary service and staple.

```bash
xcrun notarytool submit "$HOME/Desktop/${APP_NAME}.pkg" \
  --apple-id "$APPLE_ID" \
  --team-id 87DL7L9GU6 \
  --password "$APP_PASSWORD" \
  --wait
xcrun stapler staple "$HOME/Desktop/${APP_NAME}.pkg"
```

### Step 8: Verify

Confirm both the app and package pass Gatekeeper validation.

```bash
spctl -a -vv "$APP_PATH"
pkgutil --check-signature "$HOME/Desktop/${APP_NAME}.pkg"
```

### Step 9: Final quarantine cleanup

Remove any residual quarantine attributes.

```bash
xattr -r -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true
```

### Cleanup

Remove temporary files.

```bash
rm -f "/tmp/${APP_NAME}.zip"
```

## Output

The signed, notarized `.pkg` is placed on the user's Desktop at `~/Desktop/${APP_NAME}.pkg`. This file is ready to upload to Jamf Pro for Self Service distribution.

## Troubleshooting

- **"no identity found"** — Developer ID certificates are not installed. Open Keychain Access and verify both `Developer ID Application` and `Developer ID Installer` certs are present for Peninsula School District.
- **Notarization rejected** — Check the log with `xcrun notarytool log <submission-id> --apple-id ... --team-id 87DL7L9GU6 --password ...`
- **"not valid on disk"** from `spctl` — The app was modified after signing. Re-run from Step 1.
