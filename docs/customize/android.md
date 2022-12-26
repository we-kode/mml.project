---
sidebar_position: 3
---

You can customize the title, the logo and colors of your app.

## Customize

### Manually
You can customize the app manually. Please check the offical documentation on how to do this for [iOS](https://docs.flutter.dev/deployment/ios). This guide will show an automated process with github actions. 

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
For more information check the [step by step guide](https://damienaicheh.github.io/flutter/github/actions/2021/04/29/build-sign-flutter-android-github-actions-en.html). 

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

This workflow will create an aab release, which you can use to upload to the google play store.

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
          ver_dump=$(echo "${version/-ecg/''}")
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
        
  build-android:
    runs-on: ubuntu-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: Medialib-Custom
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
      # Save the jks file for signing the android app as base64 string in secrets.
      - name: Write jks
        uses: timheuer/base64-to-file@v1.1
        with:
          fileName: 'upload.jks'
          fileDir: './android/app/'
          encodedString: ${{ secrets.ANDROID_JKS }}
      # ANDROID_JKS_PASS: Password of the jks file.
      - name: Write key.properties
        run: |
          echo "storePassword=${{ secrets.ANDROID_JKS_PASS }}" >> ./android/key.properties
          echo "keyPassword=${{ secrets.ANDROID_JKS_PASS }}" >> ./android/key.properties
          echo "keyAlias=mml" >> ./android/key.properties
          echo "storeFile=upload.jks" >> ./android/key.properties
      - name: Build artifacts
        run: |
          flutter build appbundle --release
      - name: Cleanup
        run: |
          rm ./android/app/upload.jks
          rm ./android/key.properties
          mv build/app/outputs/bundle/release/app-release.aab build/app/outputs/bundle/release/mml-${{ github.ref_name }}.aab
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: Medialib-Android
          path: build/app/outputs/bundle/release
  
  release-android:
    runs-on: ubuntu-latest
    needs: [build-android]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: Medialib-Android
      - name: Android Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: mml-${{ github.ref_name }}.aab 
```

### Run action release

The sync fork action in this example will sync every week and check for a new relase. You can start the sync fork action manually. The main action will be automatically triggered if a new release exists.
The result will be an aab file you can upload to the google play store.