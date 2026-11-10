---
sidebar_position: 2
---

# Administration App

Build your customized administration app for Linux, Windows and macOS. Set up the fork, the configuration and the sync workflow first as described in [Fork and release](./fork-and-release.md).

To build manually instead, follow the official guides for [Windows](https://docs.flutter.dev/deployment/windows), [Linux](https://docs.flutter.dev/deployment/linux) and [macOS](https://docs.flutter.dev/deployment/macos).

## Linux

The Linux build is an unsigned `.zip` of the app bundle. No secrets are needed.

## Windows

The workflow creates an `.msix` package with the [msix](https://pub.dev/packages/msix) package. Windows installs it only, if it is signed with a certificate the computer trusts.

| Certificate | Trust | Cost |
| --- | --- | --- |
| Self-signed | Every admin imports your public `.cer` once | free |
| Code signing certificate of a certificate authority | trusted by Windows | yearly fee |

### 1. Create a self-signed certificate

Run in PowerShell on Windows. The subject is the publisher of the package, e.g. `CN=Example, O=Example, C=DE`.

```powershell
$cert = New-SelfSignedCertificate -Type Custom -Subject "CN=Example, O=Example, C=DE" `
  -KeyUsage DigitalSignature -FriendlyName "Medialib Admin signing" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
  -NotAfter (Get-Date).AddYears(3)
$pwd = Read-Host -AsSecureString "Password"
Export-PfxCertificate -Cert $cert -FilePath sign.pfx -Password $pwd
Export-Certificate -Cert $cert -FilePath sign.cer
```

Commit the public `sign.cer` to the branch `customization` of your fork; the workflow adds it to the release. Never commit `sign.pfx`. With a bought certificate use its `.pfx` and its subject instead and skip the `.cer`.

### 2. Create the secrets

| Secret | Value |
| --- | --- |
| `SIGN_KEY` | `sign.pfx` [base64 encoded](./fork-and-release.md#create-the-github-secrets) |
| `SIGN_PASS` | password of the `.pfx` |
| `SIGN_SUB` | subject of the certificate, e.g. `CN=Example, O=Example, C=DE` |

### 3. Install

With a self-signed certificate, admins import `sign.cer` once before installing the `.msix`: open the file, choose **Install Certificate → Local Machine** and the store **Trusted People**.

## macOS

The workflow signs the app with a **Developer ID Application** certificate, notarizes it at Apple and packs it into a `.dmg`, so macOS opens it without warnings. You need a membership in the [Apple Developer Program](https://developer.apple.com/programs/). Only the account holder can create Developer ID certificates.

### 1. Register the App ID

In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) add an **App ID** of type **App** for macOS. The bundle id is the bundle id of your `config/app.cfg`. Note the **Team ID** shown at the top right.

### 2. Create the Developer ID Application certificate

Create a certificate signing request as described for [iOS](./ios.md#2-create-the-apple-distribution-certificate). Upload it under **Certificates → +** as **Developer ID Application** (profile type G2 Sub-CA) and export certificate and private key as `.p12` with a password. The certificate is valid for five years.

### 3. Create the provisioning profile

The app stores its credentials in the keychain and needs a profile for this entitlement. Under **Profiles → +** choose **Developer ID** in the section Distribution, select the App ID and the certificate and download the `.provisionprofile` file.

### 4. Create the App Store Connect API key

Notarization uses an API key. In [App Store Connect](https://appstoreconnect.apple.com/access/integrations/api) open **Users and Access → Integrations → Team Keys**, create a key with the role **Developer** and download the `AuthKey_<Key ID>.p8`. It can be downloaded only once. Note the **Key ID** and the **Issuer ID** shown above the list.

### 5. Create the secrets

| Secret | Value |
| --- | --- |
| `MACOS_CERTIFICATE` | Developer ID `.p12` [base64 encoded](./fork-and-release.md#create-the-github-secrets) |
| `MACOS_CERTIFICATE_PWD` | password of the `.p12` |
| `MACOS_PROVISIONING_PROFILE_B64` | `.provisionprofile` base64 encoded |
| `APPLE_TEAM_ID` | Team ID |
| `APPLE_API_KEY_ID` | Key ID |
| `APPLE_API_ISSUER_ID` | Issuer ID |
| `APPLE_API_KEY_B64` | `AuthKey_<Key ID>.p8` base64 encoded |

## Workflow

Create `.github/workflows/main.yml` in the branch `customization` of your `mml.administration-app` fork. Replace `mml` with your tag suffix, `Medialib-Admin` with the name of your files and `Example` with the publisher display name.

```yaml
name: Flutter CI

on:
  push:
    tags:
      - "[0-9]+.[0-9]+.[0-9]+-mml"

jobs:
  prepare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Customizing
        run: |
          version="${{ github.ref_name }}"
          ver_dump=$(echo "${version/-mml/''}")
          chmod +x customize
          ./customize
          sed -i -E "s/version: [0-9]+.[0-9]+.[0-9]+\+[0-9]+/version: $ver_dump+${{github.run_number}}/" "./mml.administration-app/pubspec.yaml"
          sed -i -E "s/#define VERSION_AS_STRING \"1.0.0\"/#define VERSION_AS_STRING \"$ver_dump\"/" "./mml.administration-app/windows/runner/Runner.rc"
          sed -i -E "s/ DEVELOPMENT_TEAM = [A-Z0-9]+;/ DEVELOPMENT_TEAM = ${{ secrets.APPLE_TEAM_ID }};/" "./mml.administration-app/macos/Runner.xcodeproj/project.pbxproj"
      - name: Artefact customized version
        uses: actions/upload-artifact@v4
        with:
          name: Medialib-Admin-Custom
          path: mml.administration-app

  build-and-release-linux:
    runs-on: ubuntu-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v4
        with:
          name: Medialib-Admin-Custom
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - name: Install dependencies
        run: sudo apt-get install -y clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev libsecret-1-dev libjsoncpp-dev libsecret-1-0 libx11-dev libxi-dev
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: flutter gen-l10n
      - name: Build artifacts
        run: |
          flutter config --enable-linux-desktop
          flutter build linux --release
      - name: Archive Release
        uses: thedoctor0/zip-release@master
        with:
          type: 'zip'
          filename: Medialib-Admin-${{github.ref_name}}-linux.zip
          directory: build/linux/x64/release/bundle
      - name: Linux Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: build/linux/x64/release/bundle/Medialib-Admin-${{github.ref_name}}-linux.zip

  build-and-release-windows:
    runs-on: windows-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - name: Prepare sign key
        id: create-pfx
        shell: pwsh
        env:
          PFX_CONTENT: ${{ secrets.SIGN_KEY }}
        run: |
          $pfxPath = Join-Path -Path $env:RUNNER_TEMP -ChildPath "sign.pfx";
          [IO.File]::WriteAllBytes($pfxPath, [System.Convert]::FromBase64String($env:PFX_CONTENT))
          "PFX_PATH=$pfxPath" >> $env:GITHUB_OUTPUT
      - uses: actions/download-artifact@v4
        with:
          name: Medialib-Admin-Custom
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: flutter gen-l10n
      - name: Build artifacts
        run: |
          $version = "${{ github.ref_name }}"
          $ver_dump = $version.replace('-mml', '.0')
          flutter config --enable-windows-desktop
          flutter build windows --release
          dart run msix:create --version $ver_dump --install-certificate false -c ${{ steps.create-pfx.outputs.PFX_PATH }} -p ${{ secrets.SIGN_PASS }} -u Example -b "${{ secrets.SIGN_SUB }}"
          mkdir rel
          echo "Install sign.cer as Trusted People certificate of the local machine before installing the app." > rel/README_FIRST.txt
          cp sign.cer rel/sign.cer
          mv build/windows/x64/runner/Release/mml_admin.msix rel/Medialib-Admin-${{github.ref_name}}.msix
      - name: Archive Release
        uses: thedoctor0/zip-release@master
        with:
          type: 'zip'
          filename: Medialib-Admin-${{github.ref_name}}-windows.zip
          directory: rel
      - name: Windows Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: |
           rel/Medialib-Admin-${{github.ref_name}}-windows.zip
           rel/Medialib-Admin-${{github.ref_name}}.msix
      - name: Cleanup
        if: always()
        run: Remove-Item -Path ${{ steps.create-pfx.outputs.PFX_PATH }}

  build-and-release-macos:
    runs-on: macos-latest
    needs: [prepare]
    env:
      MACOS_APP_RELEASE_PATH: build/macos/Build/Products/Release
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: Medialib-Admin-Custom
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: flutter gen-l10n
      - name: Prepare keychain and provisioning profile
        env:
          MACOS_CERTIFICATE: ${{ secrets.MACOS_CERTIFICATE }}
          MACOS_CERTIFICATE_PWD: ${{ secrets.MACOS_CERTIFICATE_PWD }}
          MACOS_PROVISIONING_PROFILE: ${{ secrets.MACOS_PROVISIONING_PROFILE_B64 }}
        run: |
          KEYCHAIN_PATH="$RUNNER_TEMP/build.keychain-db"
          echo "KEYCHAIN_PATH=$KEYCHAIN_PATH" >> "$GITHUB_ENV"
          KEYCHAIN_PWD=$(openssl rand -base64 24)
          echo -n "$MACOS_CERTIFICATE" | base64 --decode -o "$RUNNER_TEMP/certificate.p12"
          security create-keychain -p "$KEYCHAIN_PWD" "$KEYCHAIN_PATH"
          security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
          security unlock-keychain -p "$KEYCHAIN_PWD" "$KEYCHAIN_PATH"
          security import "$RUNNER_TEMP/certificate.p12" -k "$KEYCHAIN_PATH" -P "$MACOS_CERTIFICATE_PWD" -f pkcs12 -T /usr/bin/codesign -T /usr/bin/security
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PWD" "$KEYCHAIN_PATH" > /dev/null
          security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | tr -d '"')
          IDENTITY=$(security find-identity -v -p codesigning "$KEYCHAIN_PATH" | grep "Developer ID Application" | head -1 | awk '{print $2}')
          if [ -z "$IDENTITY" ]; then echo "::error::No 'Developer ID Application' identity found in MACOS_CERTIFICATE"; exit 1; fi
          echo "SIGN_IDENTITY=$IDENTITY" >> "$GITHUB_ENV"

          PP_PATH="$RUNNER_TEMP/profile.provisionprofile"
          echo -n "$MACOS_PROVISIONING_PROFILE" | base64 --decode -o "$PP_PATH"
          security cms -D -i "$PP_PATH" > "$RUNNER_TEMP/profile.plist"
          PP_UUID=$(plutil -extract UUID raw -o - "$RUNNER_TEMP/profile.plist")
          PP_NAME=$(plutil -extract Name raw -o - "$RUNNER_TEMP/profile.plist")
          for dir in "$HOME/Library/MobileDevice/Provisioning Profiles" "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"; do
            mkdir -p "$dir"
            cp "$PP_PATH" "$dir/$PP_UUID.provisionprofile"
          done

          PBX=macos/Runner.xcodeproj/project.pbxproj
          sed -i '' \
            -e 's/CODE_SIGN_STYLE = Automatic;/CODE_SIGN_STYLE = Manual;/' \
            -e 's/CODE_SIGN_IDENTITY = "Apple Development";/CODE_SIGN_IDENTITY = "Developer ID Application";/' \
            -e "s|PROVISIONING_PROFILE_SPECIFIER = \"\";|PROVISIONING_PROFILE_SPECIFIER = \"$PP_NAME\";|" \
            "$PBX"
      - name: Build app
        run: |
          flutter config --enable-macos-desktop
          flutter build macos --release
      - name: Codesign app with hardened runtime
        run: |
          APP=$(find "$MACOS_APP_RELEASE_PATH" -maxdepth 1 -name "*.app" | head -1)
          echo "APP_PATH=$APP" >> "$GITHUB_ENV"
          codesign -d --entitlements - --xml "$APP" > "$RUNNER_TEMP/entitlements.plist"
          find "$APP/Contents/Frameworks" -depth \( -name "*.framework" -o -name "*.dylib" \) -print0 |
            xargs -0 -I{} codesign --force --timestamp --options runtime --sign "$SIGN_IDENTITY" "{}"
          codesign --force --timestamp --options runtime --entitlements "$RUNNER_TEMP/entitlements.plist" --sign "$SIGN_IDENTITY" "$APP"
          codesign --verify --deep --strict --verbose=2 "$APP"
      - name: Create and sign dmg
        run: |
          brew install create-dmg
          mkdir -p rel "$RUNNER_TEMP/dmg"
          ditto "$APP_PATH" "$RUNNER_TEMP/dmg/$(basename "$APP_PATH")"
          APP_NAME=$(basename "$APP_PATH")
          DMG="rel/Medialib-Admin-${{ github.ref_name }}-macos.dmg"
          echo "DMG_PATH=$DMG" >> "$GITHUB_ENV"
          create-dmg --volname "${APP_NAME%.app}" --window-pos 200 120 --window-size 800 529 \
            --icon-size 130 --text-size 14 --icon "$APP_NAME" 260 250 --hide-extension "$APP_NAME" \
            --app-drop-link 540 250 --hdiutil-quiet "$DMG" "$RUNNER_TEMP/dmg"
          codesign --force --timestamp --sign "$SIGN_IDENTITY" "$DMG"
      - name: Notarize and staple dmg
        env:
          APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
          APPLE_API_ISSUER_ID: ${{ secrets.APPLE_API_ISSUER_ID }}
          APPLE_API_KEY_B64: ${{ secrets.APPLE_API_KEY_B64 }}
        run: |
          KEY_PATH="$RUNNER_TEMP/AuthKey.p8"
          echo -n "$APPLE_API_KEY_B64" | base64 --decode -o "$KEY_PATH"
          AUTH=(--key "$KEY_PATH" --key-id "$APPLE_API_KEY_ID" --issuer "$APPLE_API_ISSUER_ID")
          RESULT=$(xcrun notarytool submit "$DMG_PATH" "${AUTH[@]}" --wait --timeout 30m --output-format json)
          echo "$RESULT"
          SUBMISSION_ID=$(echo "$RESULT" | jq -r .id)
          if [ "$(echo "$RESULT" | jq -r .status)" != "Accepted" ]; then
            xcrun notarytool log "$SUBMISSION_ID" "${AUTH[@]}"
            exit 1
          fi
          xcrun stapler staple "$DMG_PATH"
          spctl --assess --type open --context context:primary-signature --verbose=2 "$DMG_PATH"
      - name: macOS Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: ${{ env.DMG_PATH }}
      - name: Cleanup
        if: always()
        run: |
          security delete-keychain "$KEYCHAIN_PATH" || true
          rm -f "$RUNNER_TEMP/certificate.p12" "$RUNNER_TEMP/AuthKey.p8" "$RUNNER_TEMP/profile.provisionprofile"
```

If notarization fails, the step prints the log of Apple with the reason, e.g. an unsigned framework or an expired certificate.
