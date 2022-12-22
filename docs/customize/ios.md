---
sidebar_position: 4
---

# iOS App

You can customize your app by color title icon. You can do it manually, please refer to the offical docu. The guide will show an automated process with github actions. 

## Customize

copy _config fodler to config and.
Chnage the content in the config folder
icons
color schema
titles and bundle id in the config file

run ./customize script (only on ubuntu)

copy the ./mml.app fodler to the os you will build the app for and build it from source.
Consider to rename the fodler name on macos

## Github Action Workflow

All the steps above can be done with github actions

cretae a fork of the mml.app repo
customize
create workflows for lsiten on new releases.

### Listen to release tags

```
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

This workflow will cerate a aab release. If you want to create an apk please refere to the officialy docu.

```
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
          ver_dump=$(echo "${version/-ecg/''}")
          chmod +x customize
          ./customize
          sed -i -E "s/       versionName flutterVersionName/       versionName \"$ver_dump\"/" "./mml.app/android/app/build.gradle"
          sed -i -E "s/        versionCode flutterVersionCode.toInteger\(\)/        versionCode \"${{github.run_number}}\".toInteger\(\)/" "./mml.app/android/app/build.gradle"
          sed -i -E "s/version: [0-9]+.[0-9]+.[0-9]+\+[0-9]+/version: $ver_dump+${{github.run_number}}/" "./mml.app/pubspec.yaml"
      - name: Artefact customized version
        uses: actions/upload-artifact@v3
        with:
          name: ECG-Medialib-Custom
          path: mml.app
        
  build-android:
    runs-on: ubuntu-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: ECG-Medialib-Custom
      - uses: actions/setup-java@v2
        with:
          distribution: 'zulu'
          java-version: '11'
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: |
          flutter pub run build_runner build --delete-conflicting-outputs
          flutter gen-l10n
      - name: Write jks
        uses: timheuer/base64-to-file@v1.1
        with:
          fileName: 'upload-ecgm.jks'
          fileDir: './android/app/'
          encodedString: ${{ secrets.ANDROID_JKS }}
      - name: Write key.properties
        run: |
          echo "storePassword=${{ secrets.ANDROID_JKS_PASS }}" >> ./android/key.properties
          echo "keyPassword=${{ secrets.ANDROID_JKS_PASS }}" >> ./android/key.properties
          echo "keyAlias=ecgm" >> ./android/key.properties
          echo "storeFile=upload-ecgm.jks" >> ./android/key.properties
      - name: Build artifacts
        run: |
          flutter build appbundle --release
      - name: Cleanup
        run: |
          rm ./android/app/upload-ecgm.jks
          rm ./android/key.properties
          mv build/app/outputs/bundle/release/app-release.aab build/app/outputs/bundle/release/ecgm-${{ github.ref_name }}.aab
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ECG-Medialib-Android
          path: build/app/outputs/bundle/release
  
  release-android:
    runs-on: ubuntu-latest
    needs: [build-android]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: ECG-Medialib-Android
      - name: Android Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: ecgm-${{ github.ref_name }}.aab

  build-ios:
    runs-on: macos-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: ECG-Medialib-Custom
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
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
          xcodebuild -workspace ios/Runner.xcworkspace -scheme Runner -configuration Release DEVELOPMENT_TEAM=$TEAM_ID -sdk 'iphoneos' -destination 'generic/platform=iOS' -archivePath build-output/ecgm-${{ github.ref_name }}.xcarchive PROVISIONING_PROFILE=$PROVISION_PROFILE_UID clean archive CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY"
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
          echo "<key>de.ecg.medialib</key>" >> ios/ExportOptions.plist
          echo "<string>${{ secrets.PROVISION_PROFILE_UID }}</string>" >> ios/ExportOptions.plist
          echo '</dict>' >> ios/ExportOptions.plist
          echo '</dict>' >> ios/ExportOptions.plist
          echo '</plist>' >> ios/ExportOptions.plist
          cat ios/ExportOptions.plist
          xcodebuild -exportArchive -archivePath build-output/ecgm-${{ github.ref_name }}.xcarchive -exportPath build-output/ios -exportOptionsPlist ios/ExportOptions.plist
          mv build-output/ios/mml_app.ipa build-output/ios/ecgm-${{ github.ref_name }}.ipa
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ECG-Medialib-iOS
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
          name: ECG-Medialib-iOS
      - name: iOS Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: ecgm-${{ github.ref_name }}.ipa
```
### Run build

snyc fork will in this example sync every week for a new reelase. You can start build manually by runnging the sync_frok action manually.