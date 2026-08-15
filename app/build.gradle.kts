plugins {
    id("com.android.application")
}

android {
    namespace = "com.lifeos.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.lifeos.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.1"
    }

    signingConfigs {
        create("release") {
            val b64 = System.getenv("LIFEO_KEYSTORE_B64")
            if (!b64.isNullOrBlank()) {
                val f = File(System.getenv("HOME") ?: "/tmp", "lifeos-release.jks")
                f.writeBytes(java.util.Base64.getDecoder().decode(b64))
                storeFile = f
                storePassword = System.getenv("LIFEO_STORE_PASS")
                keyAlias = System.getenv("LIFEO_KEY_ALIAS")
                keyPassword = System.getenv("LIFEO_KEY_PASS")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.11.0")
}
