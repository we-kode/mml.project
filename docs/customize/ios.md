---
sidebar_position: 4
---

You can customize the title, the logo and colors of your app.

## Customize

### Manually
You can customize the app manually. Please check the offical documentation on how to do this for [windows](https://docs.flutter.dev/deployment/windows), [linux](https://docs.flutter.dev/deployment/linux) or [macOS](https://docs.flutter.dev/deployment/macos). This guide will show an automated process with github actions. 

### Automated
:::info 
The automated customization script runs on linux systems only.
:::

The [mml.app](https://github.com/we-kode/mml.app) provides one `_config` folder, where all configurations for the customization are included. Copy the `_config` folder to `config` and replace the configs with your custom needs.

:::caution Filenames
Please do not change the filenames in the config folder. Just replace them by your own files with the same filename.
:::

Icons you can [generate](https://www.appicon.co/) and replace the icons in the `icons` folder. You can [generate your custom color scheme](https://m3.material.io/theme-builder#/custom) and replace the color values in `lib_color_schemes.g.dart`.
The title in different languages and the app id you can update in the app.cfg file. Also you can add here the url for your privacy policy and an url for your legal informations or leave them blank, so no urls will be set.

To update run the `./customize` script. This script will clone the [mml.app](https://github.com/we-kode/mml.app) and replace all items with the items in the configuration. Copy the `./mml.app` folder to the os you like and [build the app from source](../setup/app).

## Github Action Workflow

All the steps above can be done with github actions. Fork the [mml.app](https://github.com/we-kode/mml.app) and [customize](#automated) the app on your needs. The github workflow consists two actions. Sync fork for listen to new releases and Flutter CI to build the app, when new release is available. You need some [github secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets). The `SYNC_PAT` is a Personal Access Token with the right to create releases.
For more information check the step by step guides [1](https://blog.auguron.com/deploying-flutter-apps-with-github-actions-c547c23c0e2f), [2](https://medium.com/team-rockstars-it/the-easiest-way-to-build-a-flutter-ios-app-using-github-actions-plus-a-key-takeaway-for-developers-48cf2ad7c72a), [3](https://damienaicheh.github.io/flutter/github/actions/2021/04/22/build-sign-flutter-ios-github-actions-en.html). 

:::info 
Replace all texts in <...Some text...> with your custom values. More comments are in code of actions.
:::

### Listen to release tags

```yaml
name: Sync fork with upstream

on:
  schedule:
  - cron:  "0 0 1/7 * *"
  workflow_dispatch:

jobs:
  repo-sync:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        token: ${{ secrets.SYNC_PAT }}
    - name: repo-sync
      uses: repo-sync/github-sync@v2
      with:
        source_repo: "https://github.com/we-kode/mml.app"
        source_branch: "master"
        destination_branch: "master"
        github_token: ${{ secrets.SYNC_PAT }}
        sync_tags: "true"
    - uses: oprypin/find-latest-tag@v1
      id: latest-tag
      with:
         repository: <your-user-name>/mml.app
    - name: Tag
      run: |
          tag=${{ steps.latest-tag.outputs.tag }}-mml
          git config user.name "${GITHUB_ACTOR}"
          git config user.email "${GITHUB_ACTOR}@users.noreply.github.com"
          git tag -a "${tag}" -m ""
          git push origin "${tag}"
      if: ${{ !endsWith(steps.latest-tag.outputs.tag,'-mml') }}
    
    - name: create release
      uses: ncipollo/release-action@v1
      if: ${{ !endsWith(steps.latest-tag.outputs.tag,'-mml') }}
      with:
        tag: ${{ steps.latest-tag.outputs.tag }}-mml
        token: ${{ secrets.SYNC_PAT }}
```
### Build the app and release it.

This workflow will create an ipa file release, which you can use to upload to the app store.

```yaml
name: Flutter CI

# Controls when the workflow will run
on:
  push:
    tags:
      - "[0-9]+.[0-9]+.[0-9]+-mml"

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  prepare:
    runs-on: ubuntu-latest
    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v3
      # Runs a set of commands using the runners shell
      - name: Customizing
        run: |
          version="${{ github.ref_name }}"
          ver_dump=$(echo "${version/-mml/''}")
          chmod +x customize
          ./customize
          sed -i -E "s/       versionName flutterVersionName/       versionName \"$ver_dump\"/" "./mml.app/android/app/build.gradle"
          sed -i -E "s/        versionCode flutterVersionCode.toInteger\(\)/        versionCode \"${{github.run_number}}\".toInteger\(\)/" "./mml.app/android/app/build.gradle"
          sed -i -E "s/version: [0-9]+.[0-9]+.[0-9]+\+[0-9]+/version: $ver_dump+${{github.run_number}}/" "./mml.app/pubspec.yaml"
      - name: Artefact customized version
        uses: actions/upload-artifact@v3
        with:
          name: Medialib-Custom
          path: mml.app

  build-ios:
    runs-on: macos-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: Medialib-Custom
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      # set your own developer id informations from your apple developer account for your app.
      - name: Install the Apple certificate and provisioning profile
        env:
          P12_BASE64: ${{ secrets.P12_BASE64 }}
          P12_PASSWORD: ${{ secrets.P12_PASSWORD }}
          PROVISION_PROFILE_BASE64: ${{ secrets.PROVISION_PROFILE_BASE64 }}
          PROVISION_PROFILE_UID: ${{ secrets.PROVISION_PROFILE_UID }}
          TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CODE_SIGN_IDENTITY: ${{ secrets.CODE_SIGN_IDENTITY }}
        run: |
          # create variables
          CERTIFICATE_PATH=$RUNNER_TEMP/build_certificate.p12
          PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db
          # import certificate and provisioning profile from secrets
          echo -n "$P12_BASE64" | base64 --decode --output $CERTIFICATE_PATH
          echo -n "$PROVISION_PROFILE_BASE64" | base64 --decode --output $PP_PATH
          # create temporary keychain
          security create-keychain -p "$P12_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$P12_PASSWORD" $KEYCHAIN_PATH
          # import certificate to keychain
          security import $CERTIFICATE_PATH -P "$P12_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH
          # apply provisioning profile
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          cp $PP_PATH ~/Library/MobileDevice/Provisioning\ Profiles
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: |
          flutter pub run build_runner build --delete-conflicting-outputs
          flutter gen-l10n
      - name: Build Flutter
        run: flutter build ios --release --no-codesign
      - name: Build resolve Swift dependencies
        run: xcodebuild -resolvePackageDependencies -workspace ios/Runner.xcworkspace -scheme Runner -configuration Release
      - name: Build xArchive
        run: |
          xcodebuild -workspace ios/Runner.xcworkspace -scheme Runner -configuration Release DEVELOPMENT_TEAM=$TEAM_ID -sdk 'iphoneos' -destination 'generic/platform=iOS' -archivePath build-output/mml-${{ github.ref_name }}.xcarchive PROVISIONING_PROFILE=$PROVISION_PROFILE_UID clean archive CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY"
      - name: Export ipa
        run: |
          echo '<?xml version="1.0" encoding="UTF-8"?>' >> ios/ExportOptions.plist
          echo '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' >> ios/ExportOptions.plist
          echo '<plist version="1.0">' >> ios/ExportOptions.plist
          echo '<dict>' >> ios/ExportOptions.plist
          echo '<key>method</key>' >> ios/ExportOptions.plist
          echo '<string>app-store</string>' >> ios/ExportOptions.plist
          echo '<key>teamID</key>' >> ios/ExportOptions.plist
          echo "<string>${{ secrets.APPLE_TEAM_ID }}</string>" >> ios/ExportOptions.plist
          echo '<key>signingStyle</key>' >> ios/ExportOptions.plist
          echo '<string>manual</string>' >> ios/ExportOptions.plist
          echo '<key>provisioningProfiles</key>' >> ios/ExportOptions.plist
          echo '<dict>' >> ios/ExportOptions.plist
          echo "<key>de.mml.medialib</key>" >> ios/ExportOptions.plist
          echo "<string>${{ secrets.PROVISION_PROFILE_UID }}</string>" >> ios/ExportOptions.plist
          echo '</dict>' >> ios/ExportOptions.plist
          echo '</dict>' >> ios/ExportOptions.plist
          echo '</plist>' >> ios/ExportOptions.plist
          cat ios/ExportOptions.plist
          xcodebuild -exportArchive -archivePath build-output/mml-${{ github.ref_name }}.xcarchive -exportPath build-output/ios -exportOptionsPlist ios/ExportOptions.plist
          mv build-output/ios/mml_app.ipa build-output/ios/mml-${{ github.ref_name }}.ipa
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: Medialib-iOS
          path: build-output/ios
      - name: Clean up
        if: ${{ always() }}
        run: |
          security delete-keychain $RUNNER_TEMP/app-signing.keychain-db
          rm ~/Library/MobileDevice/Provisioning\ Profiles/build_pp.mobileprovision
          rm ios/ExportOptions.plist
  release-ios:
    runs-on: ubuntu-latest
    needs: [build-ios]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: Medialib-iOS
      - name: iOS Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: mml-${{ github.ref_name }}.ipa
```
### Run action release

The sync fork action in this example will sync every week and check for a new relase. You can start the sync fork action manually. The main action will be automatically triggered if a new release exists.
The result will be an ipa file you can upload to the app store.