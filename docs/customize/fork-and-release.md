---
sidebar_position: 1
---

# Fork and release

We do not provide binary releases of the apps. You build and sign them yourself with GitHub Actions in your own fork. This page describes the parts, which are the same for the [administration app](./administration-app.md), [Android](./android.md) and [iOS](./ios.md).

## How it works

1. You fork [mml.app](https://github.com/we-kode/mml.app) and [mml.administration-app](https://github.com/we-kode/mml.administration-app). In each fork you create the branch `customization` from `master` and make it the default branch under **Settings → General → Default branch**. This branch holds your `config` folder and your workflows `repo_sync.yml` and `main.yml`. `master` stays an unchanged copy of the original repository.
2. The workflow `repo_sync.yml` syncs `master` and the tags of the original repository into your fork once a week. If a new release tag like `4.0.0` arrives, it tags the head of `customization` with `4.0.0-<suffix>`, e.g. `4.0.0-mml`, and creates a GitHub release for it.
3. The tag starts the workflow `main.yml`. Its `customize` script clones `master` of the original repository, applies your `config`, sets the version, builds and signs the apps and uploads them to the GitHub release.
4. You download the files from the release and publish them, e.g. in the Google Play Console, App Store Connect or on your own website.

| Platform | Output | Signing material |
| --- | --- | --- |
| Android | `.aab` | [upload keystore](./android.md#signing) |
| iOS | `.ipa` | [Apple Distribution certificate and App Store profile](./ios.md#signing) |
| Linux | `.zip` | none |
| Windows | `.msix` and `.zip` | [code signing certificate](./administration-app.md#windows) |
| macOS | notarized `.dmg` | [Developer ID certificate, profile and API key](./administration-app.md#macos) |

:::caution Release order
When a new version contains server changes, update your backend before your fork builds the apps, see the [changelogs](../changelogs/release-4.0.0.md). Disable `repo_sync.yml` in your fork, if you want to decide yourself when a release is built, and start it manually.
:::

## Customize

Do the following in the branch `customization`. The mobile app contains the default configuration in `_config`, copy it to `config`; the administration app contains `config` already. Replace the files, but do not rename them. Remove the workflows of the original repository from `.github/workflows` and add `repo_sync.yml` and `main.yml` of the platform pages.

| File | Content |
| --- | --- |
| `icons/` | App icons. [Generate](https://www.appicon.co/) them from your logo and keep the folder structure. |
| `lib_color_schemes.g.dart` | Color scheme. [Generate](https://m3.material.io/theme-builder#/custom) your colors and replace the values. |
| `app.cfg` | Title per language, the app or bundle id and, in the mobile app, the urls of your privacy policy and legal information (empty values are not shown). |

The color schemes of both apps import `package:material_ui/material_ui.dart`. The `customize` scripts rewrite color schemes of older forks, that still import `package:flutter/material.dart`.

The `customize` script clones the original repository into a subfolder (`./mml.app` or `./mml.administration-app`) and replaces the items with your configuration. It runs on Linux. To build without GitHub Actions run `./customize` and build the subfolder [from source](../setup/app.md).

If you customized the title or the colors of the mobile app, adjust the [share pages](../setup/backend/07-media.md#style-the-share-pages) of your backend as well.

## Create the GitHub secrets

The workflows read the signing material from [GitHub Actions secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) of the fork under **Settings → Secrets and variables → Actions**. Files are stored base64 encoded in one line:

```bash
# Linux
base64 -w0 <file> > <file>.b64
# macOS
base64 -i <file> -o <file>.b64
```

```powershell
# Windows
[Convert]::ToBase64String([IO.File]::ReadAllBytes("<file>")) | Out-File -NoNewline <file>.b64
```

Paste the content of the `.b64` file as secret value or use the [GitHub CLI](https://cli.github.com/): `gh secret set <NAME> --repo <your-name>/<repo> < <file>.b64`. Delete the `.b64` files afterwards and keep the originals in a safe place, e.g. a password manager.

### SYNC_PAT

`repo_sync.yml` needs a personal access token in the secret `SYNC_PAT`, since tags pushed with the default `GITHUB_TOKEN` do not start other workflows. Create a [fine-grained token](https://github.com/settings/personal-access-tokens/new) for the fork with the repository permissions **Contents: Read and write** and **Workflows: Read and write**. Workflows is needed, because the sync also updates files in `.github/workflows`. The token expires; renew it before the expiry date, otherwise no release is built.

## Sync workflow

Create `.github/workflows/repo_sync.yml` in both forks. Replace `<repo>` with `mml.app` or `mml.administration-app`, `<your-name>` with your GitHub account and `mml` with your tag suffix.

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
        source_repo: "https://github.com/we-kode/<repo>"
        source_branch: "master"
        destination_branch: "master"
        github_token: ${{ secrets.SYNC_PAT }}
        sync_tags: "true"
    - uses: oprypin/find-latest-tag@v1
      id: latest-tag
      with:
         repository: <your-name>/<repo>
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

Start a release manually with **Actions → Sync fork with upstream → Run workflow**. To build a tag again, delete the release and the tag `<version>-mml` in the fork and push the tag again.

## Renewal

| Material | Valid | When it expires |
| --- | --- | --- |
| `SYNC_PAT` | as chosen, at most 1 year | no new releases are built |
| Android upload keystore | as chosen, e.g. 25 years | do not lose it; a lost upload key can only be reset by the Google Play support |
| Apple Distribution certificate | 1 year | new iOS builds fail; installed apps keep working |
| iOS App Store profile | 1 year or until the certificate is renewed | new iOS builds fail |
| Developer ID Application certificate | 5 years | new macOS builds fail; notarized apps keep working |
| App Store Connect API key | until revoked | notarization fails |
| Windows code signing certificate | as chosen or bought | new Windows builds fail |

After renewing, update the matching secrets. The workflows never print the secrets, but anyone with write access to the fork can use them in a workflow. Restrict the write access of the fork accordingly.
