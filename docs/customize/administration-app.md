---
sidebar_position: 2
---

# Administration App

You can customize your admin app by color title icon. You can do it manually, please refer to the offical docu. The guide will show an automated process with github actions. 

### Customize

Chnage the content in the config folder
icons
color schema
titles and bundle id in the config file

run ./customize script (only on ubuntu)

copy the ./mml.administration-app fodler to the os you will build the app for and build it from source.

### Github Action Workflow

All the steps above can be done with github actions

fork and customize then cretae workflows for github actions

#### Listen to release tags

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
         repository: ecg-media/mml.administration-app
    - name: Tag
      run: |
          tag=${{ steps.latest-tag.outputs.tag }}-ecg
          git config user.name "${GITHUB_ACTOR}"
          git config user.email "${GITHUB_ACTOR}@users.noreply.github.com"
          git tag -a "${tag}" -m ""
          git push origin "${tag}"
      if: ${{ !endsWith(steps.latest-tag.outputs.tag,'-ecg') }}
    
    - name: create release
      uses: ncipollo/release-action@v1
      if: ${{ !endsWith( steps.latest-tag.outputs.tag, '-ecg' ) }}
      with:
        tag: ${{ steps.latest-tag.outputs.tag }}-ecg
        token: ${{ secrets.SYNC_PAT }}
```

#### Build the app and release it.

```
# based on https://angeloavv.medium.com/how-to-distribute-flutter-desktop-app-binaries-using-github-actions-f8d0f9be4d6b
# TODO auto incerment versions.

name: Flutter CI

# Controls when the workflow will run
on:
  push:
    tags:
      - "[0-9]+.[0-9]+.[0-9]+-ecg"

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
          sed -i -E "s/version: [0-9]+.[0-9]+.[0-9]+\+[0-9]+/version: $ver_dump+${{github.run_number}}/" "./mml.administration-app/pubspec.yaml"
          sed -i -E "s/#define VERSION_AS_STRING \"1.0.0\"/#define VERSION_AS_STRING \"$ver_dump\"/" "./mml.administration-app/windows/runner/Runner.rc"
      - name: Artefact customized version
        uses: actions/upload-artifact@v3
        with:
          name: ECG-Medialib-Admin-Custom
          path: mml.administration-app
        
  build-and-release-linux:
    # TODO create linux rpm and debian packages
    runs-on: ubuntu-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: ECG-Medialib-Admin-Custom
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
          filename: ECG-Medialib-Admin-${{github.ref_name}}-linux.zip
          directory: build/linux/x64/release/bundle
      - name: Linux Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: build/linux/x64/release/bundle/ECG-Medialib-Admin-${{github.ref_name}}-linux.zip
  
  build-and-release-windows:
    runs-on: windows-latest
    needs: [prepare]
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - name: Prepare sign key
        env:
           PFX_CONTENT: ${{ secrets.SIGN_KEY }}
        run: |
           $pfxPath = Join-Path -Path $env:RUNNER_TEMP -ChildPath "ecg_sign.pfx";
           $encodedBytes = [System.Convert]::FromBase64String($env:PFX_CONTENT);
           [IO.File]::WriteAllBytes($pfxPath, $encodedBytes)
           Write-Output "::set-output name=PFX_PATH::$pfxPath";
        id: create-pfx
        shell: pwsh
      - uses: actions/download-artifact@v3
        with:
          name: ECG-Medialib-Admin-Custom
      - name: Install project dependencies
        run: flutter pub get
      - name: Generate intermediates
        run: |
          flutter pub run build_runner build --delete-conflicting-outputs
          flutter gen-l10n
      - name: Enable windows build
        run: flutter config --enable-windows-desktop
      - name: Build artifacts
        run: |
          $version = "${{ github.ref_name }}"
          $ver_dump = $version.replace('-ecg', '.0')
          flutter build windows --release
          flutter pub run msix:create --version $ver_dump --install-certificate false -c ${{ steps.create-pfx.outputs.PFX_PATH }} -p ${{ secrets.SIGN_PASS }} -u ECG -b ${{ secrets.SIGN_SUB }}
          mkdir rel
          echo "Before installing app. Install the publisher public key in your Computer Certmanager as Trusted CA Cert, so the publisher will be trusted on your machine." > rel/README_FIRST.txt
          cp ecg_sign.cer rel/ecg_sign.cer
          mv  build/windows/runner/Release/mml_admin.msix rel/ECG-Medialib-Admin-${{github.ref_name}}.msix
      - name: Archive Release
        uses: thedoctor0/zip-release@master
        with:
          type: 'zip'
          filename: ECG-Medialib-Admin-${{github.ref_name}}-windows.zip
          directory: rel
      - name: Windows Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: rel/ECG-Medialib-Admin-${{github.ref_name}}-windows.zip
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
          name: ECG-Medialib-Admin-Custom
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
            --volname "ECG Mediathek" \
            --window-pos 200 120 \
            --window-size 800 529 \
            --icon-size 130 \
            --text-size 14 \
            --icon "ECG Mediathek.app" 260 250 \
            --hide-extension "ECG Mediathek.app" \
            --app-drop-link 540 250 \
            --hdiutil-quiet \
            "ECG-Medialib-Admin-${{github.ref_name}}-macos.dmg" \
            "ECG Mediathek.app"
      - name: macOS Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          files: build/macos/Build/Products/Release/ECG-Medialib-Admin-${{github.ref_name}}-macos.dmg
```

#### Run build

snyc fork will in this example sync every week for a new reelase. You can start build manually by runnging the sync_frok action manually.