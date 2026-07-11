#!/bin/bash
set -euo pipefail
# Costruisce "Site Factory.app" sul Desktop: un wrapper con icona che apre
# scripts/start.command in Terminale (log visibili). Rigenerabile a piacere.
REPO="$(cd "$(dirname "$0")/.." && pwd)"
APP="$HOME/Desktop/Site Factory.app"
CMD="$REPO/scripts/start.command"

chmod +x "$CMD"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# --- eseguibile: apre il .command in Terminal (così vedi i log) ---
cat > "$APP/Contents/MacOS/launcher" <<EOF
#!/bin/bash
open -a Terminal "$CMD"
EOF
chmod +x "$APP/Contents/MacOS/launcher"

# --- Info.plist ---
cat > "$APP/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Site Factory</string>
  <key>CFBundleDisplayName</key><string>Site Factory</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIdentifier</key><string>com.consulbuild.sitefactory.launcher</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSUIElement</key><true/>
</dict></plist>
EOF

# --- icona: SVG -> PNG 1024 -> .icns (tutto nativo, nessuna dipendenza) ---
SVG="$REPO/scripts/launcher-icon.svg"
TMP="$(mktemp -d)"
ICONSET="$TMP/AppIcon.iconset"
MASTER="$TMP/master.png"
mkdir -p "$ICONSET"

if ! sips -s format png "$SVG" --out "$MASTER" -Z 1024 >/dev/null 2>&1; then
  # fallback: rasterizza via QuickLook se sips non digerisce l'SVG
  qlmanage -t -s 1024 -o "$TMP" "$SVG" >/dev/null 2>&1
  mv "$TMP"/*.png "$MASTER"
fi

for s in 16 32 128 256 512; do
  sips -z "$s" "$s"             "$MASTER" --out "$ICONSET/icon_${s}x${s}.png"     >/dev/null
  sips -z "$((s*2))" "$((s*2))" "$MASTER" --out "$ICONSET/icon_${s}x${s}@2x.png"  >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

touch "$APP"   # invalida la cache icona del Finder
echo "✓ Creata: $APP"
