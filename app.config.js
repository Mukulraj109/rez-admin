const config = {
  expo: {
    name: "Rez Admin",
    slug: "rez-admin-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rez-admin",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#DC2626"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rez.admin"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#DC2626"
      },
      package: "com.rez.admin"
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#DC2626"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api',
      apiTimeout: process.env.EXPO_PUBLIC_API_TIMEOUT || '60000',
      socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5001',
      socketTimeout: process.env.EXPO_PUBLIC_SOCKET_TIMEOUT || '5000'
    }
  }
};

export default config;
