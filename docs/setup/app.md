---
sidebar_position: 3
---

# App

The mobile app can be used on android and ios devices. We do not provide binary releases.You have to build the app by your own.
Before you build your app you can [customize](/category/customization) it by adding a custom icon, title or color scheme.
We will create release tags when new features or improvemnets are available. So you can automate your build by listening on them.

## Build from source

Please check the official flutter homepage to learn on how to build the app for [android](https://docs.flutter.dev/deployment/android) and [ios](https://docs.flutter.dev/deployment/ios) from source.

## First start

On first start a private/public key will be generated to sign your requests to the backed server.

Enter Your name and register your device by scanning the qr code in the admin app.

You are ready to go.

## Announcements

After the start the app shows the active [announcements](../concepts/announcements) of the admins. This can be turned off in the settings section **Announcements** with **Show announcements on start**; the announcements can still be read there with **Show current announcements**.

## Android Auto

The Android app supports Android Auto. Records, favorites, livestreams and the discover categories can be browsed and played on the car display. If the device is not registered, the server cannot be reached or an error occurs, Android Auto shows the error message instead of the list.

Android Auto is declared in `android/app/src/main/AndroidManifest.xml` with the meta-data `com.google.android.gms.car.application`, which references `res/xml/automotive_app_desc.xml`. To publish the app in Google Play, enable the form factor **Android Auto** in the Play Console under *Test and release > Advanced settings > Form factors* and accept its terms. The app does not support **Android Automotive OS**, which requires a separate build and track.

To test without a car, use the [Desktop Head Unit](https://developer.android.com/training/cars/testing/dhu).

## Licenses

The licenses of all used packages are listed in the settings under **Licenses**. The list `lib/oss_licenses.dart` is generated with [dart_pubspec_licenses](https://pub.dev/packages/dart_pubspec_licenses) and must be generated again after dependencies changed:

```bash
dart run dart_pubspec_licenses:generate
```