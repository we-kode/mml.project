---
sidebar_position: 3
---

# App

The mobile app can be used on android and ios devices. We do not provide binary releases.You have to build the app by your own.
Before you build your app you can [customize](/category/customization) it by adding a custom icon, title or color scheme.
We will create release tags when new features or improvemnets are available. So you can automate your build by listening on them.

## Build from source

Please check the official flutter homepage to learn on how to build the app for [android](https://docs.flutter.dev/deployment/android) and [ios](https://docs.flutter.dev/deployment/ios) from source.

The app needs Flutter 3.47 or later. The Android build uses Gradle 9.3.1, the Android Gradle plugin 9.1.0 and Java 17; the app runs on Android 7 (API 24) and iOS 15 or later.

## First start

On first start a private/public key will be generated to sign your requests to the backed server.

Enter Your name and register your device by scanning the qr code in the admin app.

You are ready to go.

## Server address

The app stores the domain of the server, at which it was registered. If the server [moves to another domain](./backend/operations#move-to-another-domain), the app learns the new domain on its next start, checks in the background that it is registered there and then uses the new domain. If the check fails, the app keeps the old domain and tries again on the next start. The device never has to be registered again because of a move.

If the old domain is already switched off, scan the connection settings QR code of the admin app in the settings of the app under **Update connection settings**.

## Announcements

After the start the app shows the active [announcements](../concepts/announcements) of the admins. This can be turned off in the settings section **Announcements** with **Show announcements on start**; the announcements can still be read there with **Show current announcements**.

## Android Auto

The Android app supports Android Auto. Records, favorites, livestreams and the discover categories can be browsed and played on the car display. If the device is not registered, the server cannot be reached or an error occurs, Android Auto shows the error message instead of the list.

Android Auto is declared in `android/app/src/main/AndroidManifest.xml` with the meta-data `com.google.android.gms.car.application`, which references `res/xml/automotive_app_desc.xml`. To publish the app in Google Play, enable the form factor **Android Auto** in the Play Console under *Test and release > Advanced settings > Form factors* and accept its terms. The app does not support **Android Automotive OS**, which requires a separate build and track.

To test without a car, use the [Desktop Head Unit](https://developer.android.com/training/cars/testing/dhu).

## Licenses

The licenses of all packages and libraries bundled with the app are listed in the settings under **Licenses**. Flutter collects them during the build, so the list does not have to be generated after dependencies changed.