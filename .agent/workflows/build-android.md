---
description: How to build a release APK for Android
---

To generate a standalone Android APK, follow these steps:

1. **Install EAS CLI** (if not already installed):

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:

   ```bash
   eas login
   ```

3. **Configure Project**:

   ```bash
   eas build:configure
   ```

4. **Run APK Build**:
   ```bash
   eas build --platform android --profile preview
   ```
   _Note: This will output a link to download the `.apk` file once finished._

// turbo 5. **Verify Configuration**:
Check if `eas.json` exists and contains the `preview` profile with `buildType: apk`.
