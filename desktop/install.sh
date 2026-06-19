#!/usr/bin/env bash
# Installe Emailor comme application desktop Debian (entrée de menu + icône).
# N'utilise que le webview système (WebKit2GTK) et Python/GTK déjà présents.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ Dépendances & build…"
[ -d node_modules ] || npm install
npm run build

APPS="$HOME/.local/share/applications"
mkdir -p "$APPS"
DESKTOP="$APPS/emailor.desktop"

cat > "$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=Recherche d'email
GenericName=Recherche & vérification d'email
Comment=Moteur de recherche d'adresses email professionnelles assisté par IA
Exec=python3 "$ROOT/desktop/emailor_app.py"
Icon=$ROOT/desktop/emailor.svg
Terminal=false
Categories=Network;Utility;
StartupNotify=true
EOF

chmod +x "$ROOT/desktop/emailor_app.py" || true
update-desktop-database "$APPS" 2>/dev/null || true

echo "✓ Installé : $DESKTOP"
echo "  Cherche « Recherche d'email » dans le menu d'applications, ou lance :"
echo "    python3 \"$ROOT/desktop/emailor_app.py\""
