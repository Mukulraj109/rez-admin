# Rez Admin - iOS & Android Deployment Guide

## Prerequisites

### Required Accounts
| Account | Cost | Link |
|---------|------|------|
| Apple Developer | $99/year | https://developer.apple.com |
| Google Play Developer | $25 one-time | https://play.google.com/console |
| Expo Account | Free | https://expo.dev |

### Required Tools
```bash
# Install EAS CLI (already done)
npm install -g eas-cli

# Verify installation
eas --version
```

---

## Step 1: Login & Configure

```bash
# Login to your Expo account
eas login

# Configure EAS for the project (run from rez-admin directory)
cd rez-admin
npm run eas:configure
```

---

## Step 2: iOS Deployment

### 2.1 Development Build (iOS Simulator)
```bash
npm run build:dev:ios
```
This creates a build you can test on the iOS Simulator.

### 2.2 Preview Build (TestFlight)
```bash
npm run build:preview:ios
```
Download the `.ipa` file and upload to TestFlight for internal testing.

### 2.3 Production Build (App Store)
```bash
npm run build:prod:ios
```

### 2.4 Submit to App Store
Before submitting, update `eas.json` with your Apple credentials:
```json
"ios": {
  "appleId": "your-email@example.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABCD1234"
}
```

Then submit:
```bash
npm run submit:ios
```

### iOS App Store Requirements
| Item | Specification |
|------|---------------|
| App Name | Rez Admin |
| Bundle ID | com.rez.admin |
| App Icon | 1024x1024px PNG (no transparency) |
| Screenshots | iPhone 6.7", 6.5", 5.5", iPad Pro |
| Privacy Policy URL | Required |
| App Description | Required |

---

## Step 3: Android Deployment

### 3.1 Development Build (APK for testing)
```bash
npm run build:dev:android
```
Download and install the APK directly on your device.

### 3.2 Preview Build (Internal testing APK)
```bash
npm run build:preview:android
```

### 3.3 Production Build (Play Store)
```bash
npm run build:prod:android
```
This creates an `.aab` (Android App Bundle) for Play Store submission.

### 3.4 Setup Google Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Play Android Developer API**
4. Create a **Service Account** with Editor role
5. Download the JSON key file
6. Save as `google-service-account.json` in the `rez-admin` folder
7. In Google Play Console, go to **Settings > API access** and link the service account

### 3.5 Submit to Play Store
```bash
npm run submit:android
```

### Android Play Store Requirements
| Item | Specification |
|------|---------------|
| App Name | Rez Admin |
| Package Name | com.rez.admin |
| App Icon | 512x512px PNG |
| Feature Graphic | 1024x500px |
| Screenshots | Phone, 7" tablet, 10" tablet |
| Privacy Policy URL | Required |
| Content Rating | Complete questionnaire |
| Target API Level | API 34+ (Android 14) |

---

## Step 4: Build Both Platforms

To build iOS and Android simultaneously:
```bash
npm run build:prod:all
```

---

## Available Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run eas:configure` | Initialize EAS configuration |
| `npm run build:dev:ios` | iOS development build (simulator) |
| `npm run build:dev:android` | Android development build (APK) |
| `npm run build:preview:ios` | iOS preview build (TestFlight) |
| `npm run build:preview:android` | Android preview build (APK) |
| `npm run build:prod:ios` | iOS production build (App Store) |
| `npm run build:prod:android` | Android production build (AAB) |
| `npm run build:prod:all` | Build both platforms for production |
| `npm run submit:ios` | Submit to App Store |
| `npm run submit:android` | Submit to Play Store |

---

## Troubleshooting

### Build Failed
```bash
# Clear EAS cache and rebuild
eas build --clear-cache --platform [ios|android] --profile [profile]
```

### Credentials Issues (iOS)
```bash
# Reset iOS credentials
eas credentials --platform ios
```

### Check Build Status
```bash
# View all builds
eas build:list

# View specific build logs
eas build:view [build-id]
```

### Local Build (requires Xcode/Android Studio)
```bash
# iOS (requires macOS with Xcode)
npm run ios

# Android (requires Android Studio)
npm run android
```

---

## Environment Configuration

The app uses different environment variables per build profile:

| Profile | Environment | API URL |
|---------|-------------|---------|
| development | development | Local/Dev server |
| preview | staging | https://rez-backend-vvhl.onrender.com/api |
| production | production | https://rez-backend-vvhl.onrender.com/api |

To modify environment variables, edit `eas.json` under each profile's `env` section.

---

## Post-Deployment Checklist

### iOS
- [ ] App appears in App Store Connect
- [ ] TestFlight build available for testers
- [ ] Screenshots uploaded for all device sizes
- [ ] App description and keywords set
- [ ] Privacy policy URL added
- [ ] App Review Information completed
- [ ] Submit for review

### Android
- [ ] App appears in Google Play Console
- [ ] Internal testing track configured
- [ ] Store listing completed
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL added
- [ ] Target audience and content settings
- [ ] Submit for review

---

## Useful Links

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/console/policy-center)
