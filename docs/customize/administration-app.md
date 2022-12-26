---
sidebar_position: 2
---

# Administration App

You can customize the title, the logo and colors of your admin app.

## Customize

### Manually
You can customize the app manually. Please check the offical documentation on how to do this for [windows](https://docs.flutter.dev/deployment/windows), [linux](https://docs.flutter.dev/deployment/linux) or [macOS](https://docs.flutter.dev/deployment/macos). This guide will show an automated process with github actions. 
### Automated

:::info 
The automated customization script runs on linux systems only.
:::

The [mml.administration-app](https://github.com/we-kode/mml.administration-app) provides one `config` folder, where all configurations for the customization are included. Replace the configs with your custom needs.

:::caution Filenames
Please do not change the filenames in the config folder. Just replace them by your own files with the same filename.
:::

Icons you can [generate](https://www.appicon.co/) and replace the icons in the `icons` folder. You can [generate your custom color scheme](https://m3.material.io/theme-builder#/custom) and replace the color values in `lib_color_schemes.g.dart`.
The title in different languages and the bundle or app id you can update in the app.cfg file.

To update run the `./customize` script. This script will clone the [mml.administration-app](https://github.com/we-kode/mml.administration-app) and replace all items with the items in the configuration. Copy the `./mml.administration-app` folder to the os you like and [build the app from source](../setup/administration-app).

## Github Action Workflow

All the steps above can be done with github actions. Fork the [mml.administration-app](https://github.com/we-kode/mml.administration-app) and [customize](#automated) the app on your needs. The github workflow consists two actions. Sync fork for listen to new releases and Flutter CI to build the app, when new release is available. You need some [github secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets). The `SYNC_PAT` is a Personal Access Token with the right to create releases.
For more information check the [step by step guides](https://angeloavv.medium.com/how-to-distribute-flutter-desktop-app-binaries-using-github-actions-f8d0f9be4d6b) for [windows msix](https://pub.dev/packages/msix), linux and [macOS dmg](https://medium.com/flutter-community/build-sign-and-deliver-flutter-macos-desktop-applications-on-github-actions-5d9b69b0469c). 

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
        persist-credentials: false
    - name: repo-sync
      uses: repo-sync/github-sync@v2
      with:
        source_repo: "https://github.com/we-kode/mml.administration-app"
        source_branch: "master"
        destination_branch: "master"
        github_token: ${{ secrets.SYNC_PAT }}
        sync_tags: "true"
    - uses: oprypin/find-latest-tag@v1
      id: latest-tag
      with:
         repository: <your-name>/mml.administration-app
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
      if: ${{ !endsWith( steps.latest-tag.outputs.tag, '-mml' ) }}
      with:
        tag: ${{ steps.latest-tag.outputs.tag }}-mml
        token: ${{ secrets.SYNC_PAT }}
```

### Build the app and release it.

:::caution Windows signing
On windows you need to [create a pfx certificate](https://sahajrana.medium.com/how-to-generate-a-pfx-certificate-for-flutter-windows-msix-lib-a860cdcebb8) to sign the msxi so windows will allow to install the app.
:::

:::caution macOS build not signed
This example action does not create a signed macOS app. The app cretaed for macOS will not run on your mac machines, cause of unknown developer. You need to sign it first. Please check [this guide](https://medium.com/flutter-community/build-sign-and-deliver-flutter-macos-desktop-applications-on-github-actions-5d9b69b0469c) how to sign the macOS app.
:::

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
          sed -i -E "s/version: [0-9]+.[0-9]+.[0-9]+\+[0-9]+/version: $ver_dump+${{github.run_number}}/" "./mml.administration-app/pubspec.yaml"
          sed -i -E "s/#define VERSION_AS_STRING \"1.0.0\"/#define VERSION_AS_STRING \"$ver_dump\"/" "./mml.administration-app/windows/runner/Runner.rc"
      - name: Artefact customized version
        uses: actions/upload-artifact@v3
        with:
          name: Admin-Custom
          path: mml.administration-app
        
  build-and-release-linux:
    runs-on: ubuntu-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: Admin-Custom
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - name: Install dependencies
        run: sudo apt-get install -y clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev libsecret-1-dev libjsoncpp-dev libsecret-1-0
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: |
          flutter pub run build_runner build --delete-conflicting-outputs
          flutter gen-l10n
      - name: Enable linux build
        run: flutter config --enable-linux-desktop
      - name: Build artifacts
        run: |
          flutter build linux --release
      - name: Archive Release
        uses: thedoctor0/zip-release@master
        with:
          type: 'zip'
          filename: Admin-${{github.ref_name}}-linux.zip
          directory: build/linux/x64/release/bundle
      - name: Linux Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: build/linux/x64/release/bundle/Admin-${{github.ref_name}}-linux.zip
  
  build-and-release-windows:
    runs-on: windows-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      # save the sign key as base64 string in github secrets
      - name: Prepare sign key
        env:
           PFX_CONTENT: ${{ secrets.SIGN_KEY }}
        run: |
           $pfxPath = Join-Path -Path $env:RUNNER_TEMP -ChildPath "sign.pfx";
           $encodedBytes = [System.Convert]::FromBase64String($env:PFX_CONTENT);
           [IO.File]::WriteAllBytes($pfxPath, $encodedBytes)
           Write-Output "::set-output name=PFX_PATH::$pfxPath";
        id: create-pfx
        shell: pwsh
      - uses: actions/download-artifact@v3
        with:
          name: Admin-Custom
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: |
          flutter pub run build_runner build --delete-conflicting-outputs
          flutter gen-l10n
      - name: Enable windows build
        run: flutter config --enable-windows-desktop
      # SIGN_PASS: Password of the sign cert.
      # SIGN_SUB: Subject of the sign cert, e.g
      #  CN = MML
      #  OU = ORGANIZATION UNIT
      #  O = MML
      #  C = US
      - name: Build artifacts
        run: |
          $version = "${{ github.ref_name }}"
          $ver_dump = $version.replace('-ecg', '.0')
          flutter build windows --release
          flutter pub run msix:create --version $ver_dump --install-certificate false -c ${{ steps.create-pfx.outputs.PFX_PATH }} -p ${{ secrets.SIGN_PASS }} -u <Username> -b ${{ secrets.SIGN_SUB }}
          mkdir rel
          echo "Before installing app. Install the publisher public key in your Computer Certmanager as Trusted CA Cert, so the publisher will be trusted on your machine." > rel/README_FIRST.txt
          cp sign.cer rel/sign.cer
          mv  build/windows/runner/Release/mml_admin.msix rel/Admin-${{github.ref_name}}.msix
      - name: Archive Release
        uses: thedoctor0/zip-release@master
        with:
          type: 'zip'
          filename: Admin-${{github.ref_name}}-windows.zip
          directory: rel
      - name: Windows Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: rel/Admin-${{github.ref_name}}-windows.zip
      - name: Cleanup
        run: |
           Remove-Item -Path ${{ steps.create-pfx.outputs.PFX_PATH }};
  
  build-and-release-macos:
    runs-on: macos-latest
    needs: [prepare]
    env:
      MACOS_APP_RELEASE_PATH: build/macos/Build/Products/Release
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: Admin-Custom
      - uses: subosito/flutter-action@v1
        with:
          channel: 'stable'
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: |
          flutter pub run build_runner build --delete-conflicting-outputs
          flutter gen-l10n
      - name: Enable macOS build
        run: flutter config --enable-macos-desktop
      - name: Build artifacts
        run: flutter build macos --release
      - name: Create a dmg
        run: |
          echo "Install create-dmg"
          brew install create-dmg
          cd $MACOS_APP_RELEASE_PATH
          create-dmg \
            --volname "<App Title>" \
            --window-pos 200 120 \
            --window-size 800 529 \
            --icon-size 130 \
            --text-size 14 \
            --icon "<App Title>.app" 260 250 \
            --hide-extension "<App Title>.app" \
            --app-drop-link 540 250 \
            --hdiutil-quiet \
            "Admin-${{github.ref_name}}-macos.dmg" \
            "<App Title>.app"
      - name: macOS Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: build/macos/Build/Products/Release/Admin-${{github.ref_name}}-macos.dmg
```

### Run action release

The sync fork action in this example will sync every week and check for a new relase. You can start the sync fork action manually. The main action will be automatically triggered if a new release exists.
The result will be a binary file for linux, a msix installer for windows and a dmg file for macOS.