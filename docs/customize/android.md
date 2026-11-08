---
sidebar_position: 3
---

# Android

Build a signed Android App Bundle (`.aab`) of your customized mobile app and publish it in Google Play. Set up the fork, the configuration and the sync workflow first as described in [Fork and release](./fork-and-release.md).

To build manually instead, follow the official guide on [building and releasing an Android app](https://docs.flutter.dev/deployment/android).

## Signing

Google Play signs the app for the devices with its own key ([Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)). Your workflow signs the bundle with an **upload key**, which proves to Google that the upload comes from you.

### 1. Create the Google Play app

1. Create a [Google Play Console](https://play.google.com/console) developer account.
2. Create an app. Its package name is the `appId` of your `config/app.cfg`, e.g. `com.example.medialib`. It can not be changed later.
3. Keep Play App Signing enabled, which is the default for new apps.

### 2. Create the upload keystore

Create the keystore with `keytool` of a Java JDK. Choose an alias, e.g. `upload`, and a strong password. `keytool` asks for the password and your name or organization.

```bash
keytool -genkey -v -keystore upload.jks -storetype PKCS12 -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Keep `upload.jks` and the password in a safe place. If you lose it, the upload key can only be reset by the Google Play support.

### 3. Create the secrets

| Secret | Value |
| --- | --- |
| `ANDROID_JKS` | `upload.jks` [base64 encoded](./fork-and-release.md#create-the-github-secrets) |
| `ANDROID_JKS_PASS` | password of the keystore and the key |

The alias is set in the workflow below. The build of the original repository reads `android/key.properties`, which the workflow creates from the secrets.

## Workflow

Create `.github/workflows/main.yml` in the branch `customization` of your `mml.app` fork. Replace `mml` with your tag suffix, `upload` with your alias and `Medialib` with a name for your files. The `prepare` job is also used by the [iOS jobs](./ios.md#workflow), add them to the same file.

```yaml
name: Flutter CI

on:
  push:
    tags:
      - "[0-9]+.[0-9]+.[0-9]+-mml"
      - "[0-9]+.[0-9]+.[0-9]+-beta-mml"

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
          sed -i -E "s/       versionName flutterVersionName/       versionName \"$ver_dump\"/" "./mml.app/android/app/build.gradle"
          sed -i -E "s/        versionCode flutterVersionCode.toInteger\(\)/        versionCode \"${{github.run_number}}\".toInteger\(\)/" "./mml.app/android/app/build.gradle"
          sed -i -E "s/version: [0-9]+.[0-9]+.[0-9]+\+[0-9]+/version: $ver_dump+${{github.run_number}}/" "./mml.app/pubspec.yaml"
      - name: Artefact customized version
        uses: actions/upload-artifact@v4
        with:
          name: Medialib-Custom
          path: mml.app

  build-android:
    runs-on: ubuntu-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v4
        with:
          name: Medialib-Custom
      - uses: actions/setup-java@v2
        with:
          distribution: 'zulu'
          java-version: '17'
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: flutter gen-l10n
      - name: Write jks
        uses: timheuer/base64-to-file@v1.1
        with:
          fileName: 'upload.jks'
          fileDir: './android/app/'
          encodedString: ${{ secrets.ANDROID_JKS }}
      - name: Write key.properties
        run: |
          echo "storePassword=${{ secrets.ANDROID_JKS_PASS }}" >> ./android/key.properties
          echo "keyPassword=${{ secrets.ANDROID_JKS_PASS }}" >> ./android/key.properties
          echo "keyAlias=upload" >> ./android/key.properties
          echo "storeFile=upload.jks" >> ./android/key.properties
      - name: Build artifacts
        run: flutter build appbundle --release
      - name: Cleanup
        run: |
          rm ./android/app/upload.jks
          rm ./android/key.properties
          mv build/app/outputs/bundle/release/app-release.aab build/app/outputs/bundle/release/Medialib-${{ github.ref_name }}.aab
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: Medialib-Android
          path: build/app/outputs/bundle/release

  release-android:
    runs-on: ubuntu-latest
    needs: [build-android]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v4
        with:
          name: Medialib-Android
      - name: Android Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: Medialib-${{ github.ref_name }}.aab
```

The version name is the tag without suffix, the version code is the number of the workflow run, so every build has a higher code.

## Publish

Download the `.aab` from the GitHub release of your fork and upload it in the Google Play Console, e.g. first to **Testing → Internal testing** and then to **Production**. Google Play rejects a bundle signed with another upload key.
