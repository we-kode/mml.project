---
sidebar_position: 4
---

# iOS

Build a signed `.ipa` of your customized mobile app and publish it in the App Store. Set up the fork, the configuration and the sync workflow first as described in [Fork and release](./fork-and-release.md). The iOS jobs belong to the same `main.yml` as the [Android jobs](./android.md#workflow) and use its `prepare` job.

To build manually instead, follow the official guide on [building and releasing an iOS app](https://docs.flutter.dev/deployment/ios).

## Signing

You need a membership in the [Apple Developer Program](https://developer.apple.com/programs/). Most steps work in the browser; the certificate request can be created on a Mac or with `openssl`.

### 1. Register the App ID

In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) add an **App ID** of type **App**. The bundle id is the `appId` of your `config/app.cfg`, e.g. `com.example.medialib`. Note the **Team ID** shown at the top right of the developer account.

Then create the app in [App Store Connect](https://appstoreconnect.apple.com/) under **Apps → +** with this bundle id.

### 2. Create the Apple Distribution certificate

Create a certificate signing request (CSR):

- On a Mac: **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority**, saved to disk.
- With openssl:

  ```bash
  openssl genrsa -out distribution.key 2048
  openssl req -new -key distribution.key -out distribution.csr -subj "/emailAddress=<mail>/CN=<name>/C=DE"
  ```

Upload the CSR under **Certificates → +** as **Apple Distribution** and download `distribution.cer`. Export certificate and private key as `.p12` with a password:

- On a Mac: open the `.cer`, select the certificate with its key in Keychain Access and choose **Export** as `.p12`.
- With openssl:

  ```bash
  openssl x509 -inform DER -in distribution.cer -out distribution.pem
  openssl pkcs12 -export -legacy -inkey distribution.key -in distribution.pem -out distribution.p12
  ```

  `-legacy` keeps the `.p12` readable by the keychain of macOS. Older openssl versions do not know the option; omit it there.

The certificate is valid for one year. The name of the identity is `Apple Distribution: <name> (<Team ID>)`.

### 3. Create the provisioning profile

Under **Profiles → +** choose **App Store Connect**, select the App ID and the distribution certificate, name the profile and download the `.mobileprovision` file. Read its UUID on a Mac:

```bash
security cms -D -i profile.mobileprovision | plutil -extract UUID raw -
```

Without a Mac open the file in a text editor and copy the value after `<key>UUID</key>`. Create a new profile, whenever the certificate is renewed.

### 4. Create the secrets

| Secret | Value |
| --- | --- |
| `P12_BASE64` | `distribution.p12` [base64 encoded](./fork-and-release.md#create-the-github-secrets) |
| `P12_PASSWORD` | password of the `.p12` |
| `PROVISION_PROFILE_BASE64` | `profile.mobileprovision` base64 encoded |
| `PROVISION_PROFILE_UID` | UUID of the profile |
| `APPLE_TEAM_ID` | Team ID |
| `CODE_SIGN_IDENTITY` | `Apple Distribution` or the full name of the identity |

## Workflow

Add the jobs to `.github/workflows/main.yml` of the [Android page](./android.md#workflow). Replace `com.example.medialib` with your bundle id and `Medialib` with the name of your files.

```yaml
  build-ios:
    runs-on: macos-15
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v4
        with:
          name: Medialib-Custom
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - name: Install the Apple certificate and provisioning profile
        env:
          P12_BASE64: ${{ secrets.P12_BASE64 }}
          P12_PASSWORD: ${{ secrets.P12_PASSWORD }}
          PROVISION_PROFILE_BASE64: ${{ secrets.PROVISION_PROFILE_BASE64 }}
        run: |
          CERTIFICATE_PATH=$RUNNER_TEMP/build_certificate.p12
          PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db
          echo -n "$P12_BASE64" | base64 --decode > $CERTIFICATE_PATH
          echo -n "$PROVISION_PROFILE_BASE64" | base64 --decode > $PP_PATH
          security create-keychain -p "$P12_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$P12_PASSWORD" $KEYCHAIN_PATH
          security import $CERTIFICATE_PATH -P "$P12_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          cp $PP_PATH ~/Library/MobileDevice/Provisioning\ Profiles
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: flutter gen-l10n
      - name: Build Flutter
        run: flutter build ios --release --no-codesign
      - name: Resolve Swift dependencies
        run: xcodebuild -resolvePackageDependencies -workspace ios/Runner.xcworkspace -scheme Runner -configuration Release
      - name: Build xcarchive
        env:
          PROVISION_PROFILE_UID: ${{ secrets.PROVISION_PROFILE_UID }}
          TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CODE_SIGN_IDENTITY: ${{ secrets.CODE_SIGN_IDENTITY }}
        run: |
          xcodebuild -workspace ios/Runner.xcworkspace -scheme Runner -configuration Release DEVELOPMENT_TEAM=$TEAM_ID -sdk 'iphoneos' -destination 'generic/platform=iOS' -archivePath build-output/Medialib-${{ github.ref_name }}.xcarchive PROVISIONING_PROFILE=$PROVISION_PROFILE_UID clean archive CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY"
      - name: Export ipa
        env:
          PROVISION_PROFILE_UID: ${{ secrets.PROVISION_PROFILE_UID }}
          TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          cat > ios/ExportOptions.plist <<EOF
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>method</key><string>app-store</string>
            <key>teamID</key><string>$TEAM_ID</string>
            <key>signingStyle</key><string>manual</string>
            <key>provisioningProfiles</key>
            <dict>
              <key>com.example.medialib</key><string>$PROVISION_PROFILE_UID</string>
            </dict>
          </dict>
          </plist>
          EOF
          xcodebuild -exportArchive -archivePath build-output/Medialib-${{ github.ref_name }}.xcarchive -exportPath build-output/ios -exportOptionsPlist ios/ExportOptions.plist
          mv build-output/ios/mml_app.ipa build-output/ios/Medialib-${{ github.ref_name }}.ipa
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: Medialib-iOS
          path: build-output/ios
      - name: Clean up
        if: ${{ always() }}
        run: |
          security delete-keychain $RUNNER_TEMP/app-signing.keychain-db
          rm ~/Library/MobileDevice/Provisioning\ Profiles/build_pp.mobileprovision
          rm -f ios/ExportOptions.plist

  release-ios:
    runs-on: ubuntu-latest
    needs: [build-ios]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v4
        with:
          name: Medialib-iOS
      - name: iOS Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: Medialib-${{ github.ref_name }}.ipa
```

## Publish

Download the `.ipa` from the GitHub release of your fork and upload it with [Transporter](https://apps.apple.com/app/transporter/id1450874784) on a Mac. Then add the build to a TestFlight group or submit it for review in App Store Connect.

App Review needs access to a server. Enter the address of a demo server, e.g. a deployment of [mml.demo](https://github.com/we-kode/mml.demo) of the same version, and the registration steps in the review notes.
