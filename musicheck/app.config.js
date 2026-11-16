module.exports = {
    name: "MusiCheck",
    slug: "musicheck",
    scheme: "musicheck",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
        supportsTablet: false,
        bundleIdentifier: "br.com.fiap.musicheck",
    },
    android: {
        package: "br.com.fiap.musicheck",
        adaptiveIcon: {
            backgroundColor: "#3B2A7A",
            foregroundImage: "./assets/android-icon-foreground.png",
            backgroundImage: "./assets/android-icon-background.png",
            monochromeImage: "./assets/android-icon-monochrome.png",
        },
    },
    web: {
        favicon: "./assets/favicon.png",
    },
    plugins: [
        "expo-router",
        [
            "expo-location",
            { locationWhenInUsePermission: "O MusiCheck usa sua localização para confirmar que você está na escola no check-in." },
        ],
    ],
}
