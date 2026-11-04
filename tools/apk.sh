#!/usr/bin/env bash
# Construye la APK de NEXUS CAOS sin Gradle: aapt2 + javac + d8 + zipalign + apksigner.
# Variables: ANDROID_BT (carpeta de build-tools), ANDROID_JAR (android.jar de la plataforma 35),
#            NEXUS_KS (keystore .jks, NO va en el repo) y NEXUS_KS_PASS (su contraseña).
set -euo pipefail
R=$(cd "$(dirname "$0")/.." && pwd)
BT=${ANDROID_BT:?Falta ANDROID_BT}; JAR=${ANDROID_JAR:?Falta ANDROID_JAR}; KS=${NEXUS_KS:?Falta NEXUS_KS}
VERSION=1.2.0; CODE=3
B=$R/dist/apk-build; rm -rf "$B"; mkdir -p "$B/gen/com/infinitetree/nexuscaos" "$B/classes" "$B/dex" "$B/assets"
node "$R/tools/build.js" --android --salida="$B/assets/index.html"
"$BT/aapt2" compile --dir "$R/android/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/base.apk" -I "$JAR" --manifest "$R/android/AndroidManifest.xml" --java "$B/gen" \
  --min-sdk-version 24 --target-sdk-version 35 --version-code $CODE --version-name $VERSION \
  -A "$B/assets" "$B/res.zip" --auto-add-overlay
echo "package com.infinitetree.nexuscaos; final class BuildConfigNexus { static final String VERSION = \"$VERSION\"; }" > "$B/gen/com/infinitetree/nexuscaos/BuildConfigNexus.java"
javac --release 11 -encoding UTF-8 -nowarn -cp "$JAR" -d "$B/classes" $(find "$R/android/java" "$B/gen" -name '*.java')
"$BT/d8" --release --min-api 24 --lib "$JAR" --output "$B/dex" $(find "$B/classes" -name '*.class')
cp "$B/base.apk" "$B/sin-alinear.apk"
(cd "$B/dex" && zip -q -j "$B/sin-alinear.apk" classes.dex)
"$BT/zipalign" -f 4 "$B/sin-alinear.apk" "$B/alineada.apk"
"$BT/apksigner" sign --ks "$KS" --ks-pass env:NEXUS_KS_PASS --ks-key-alias nexuscaos --out "$R/dist/NexusCaos-$VERSION.apk" "$B/alineada.apk"
"$BT/apksigner" verify --verbose "$R/dist/NexusCaos-$VERSION.apk" | head -4
ls -la "$R/dist/NexusCaos-$VERSION.apk"
