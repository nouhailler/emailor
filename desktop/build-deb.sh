#!/usr/bin/env bash
# Construit un paquet Debian (.deb) installable de l'application Emailor.
#
# Le paquet embarque le build web (dist/) + le lanceur Python/GTK, et déclare ses
# dépendances système (python3-gi, WebKit2GTK, GTK3) pour qu'apt les installe.
# Architecture « all » : aucun binaire compilé (Python + assets statiques).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo 0.1.0)"
PKG="emailor"
OUT_DIR="$ROOT/dist-deb"
STAGE="$OUT_DIR/${PKG}_${VERSION}"

echo "→ Build web…"
[ -d node_modules ] || npm install
npm run build

echo "→ Assemblage de l'arborescence du paquet…"
rm -rf "$STAGE"
mkdir -p "$STAGE/DEBIAN"
mkdir -p "$STAGE/usr/lib/$PKG/desktop"
mkdir -p "$STAGE/usr/bin"
mkdir -p "$STAGE/usr/share/applications"
mkdir -p "$STAGE/usr/share/icons/hicolor/scalable/apps"

# Build web + lanceur
cp -r "$ROOT/dist" "$STAGE/usr/lib/$PKG/dist"
cp "$ROOT/desktop/emailor_app.py" "$STAGE/usr/lib/$PKG/desktop/"
cp "$ROOT/desktop/smtp_verify.py" "$STAGE/usr/lib/$PKG/desktop/"
cp "$ROOT/desktop/providers.py" "$STAGE/usr/lib/$PKG/desktop/"
cp "$ROOT/desktop/emailor.svg" "$STAGE/usr/lib/$PKG/desktop/"
cp "$ROOT/desktop/emailor.svg" "$STAGE/usr/share/icons/hicolor/scalable/apps/$PKG.svg"

# Exécutable /usr/bin/emailor
cat > "$STAGE/usr/bin/$PKG" <<'EOF'
#!/bin/sh
exec python3 /usr/lib/emailor/desktop/emailor_app.py "$@"
EOF
chmod 0755 "$STAGE/usr/bin/$PKG"

# Entrée de menu
cat > "$STAGE/usr/share/applications/$PKG.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Recherche d'email
GenericName=Recherche & vérification d'email
Comment=Moteur de recherche d'adresses email professionnelles assisté par IA
Exec=$PKG
Icon=$PKG
Terminal=false
Categories=Network;Utility;
StartupNotify=true
EOF

INSTALLED_KB="$(du -sk "$STAGE" | cut -f1)"

# Métadonnées du paquet
cat > "$STAGE/DEBIAN/control" <<EOF
Package: $PKG
Version: $VERSION
Section: net
Priority: optional
Architecture: all
Depends: python3, python3-gi, gir1.2-gtk-3.0, gir1.2-webkit2-4.1
Installed-Size: $INSTALLED_KB
Maintainer: nouhailler <patrick.nouhailler@gmail.com>
Homepage: https://github.com/nouhailler/emailor
Description: Recherche & vérification d'email assistée par IA
 Application desktop (GTK / WebKit2GTK) pour retrouver l'adresse email
 professionnelle d'une personne : raisonnement IA via OpenRouter, résolution
 d'identité, vérification DNS/SMTP réelle et normalisation des noms.
 .
 N'embarque ni navigateur ni Electron : utilise le webview système.
EOF

# Hook post-installation : rafraîchit les caches de menu/icônes
cat > "$STAGE/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
update-desktop-database -q /usr/share/applications 2>/dev/null || true
gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
exit 0
EOF
chmod 0755 "$STAGE/DEBIAN/postinst"

echo "→ Construction du .deb…"
DEB="$OUT_DIR/${PKG}_${VERSION}_all.deb"
fakeroot dpkg-deb --build "$STAGE" "$DEB" >/dev/null

echo "✓ Paquet créé : $DEB"
echo
dpkg-deb --info "$DEB" | sed 's/^/    /'
echo
echo "Installer :   sudo apt install \"$DEB\"   (ou : sudo dpkg -i \"$DEB\" && sudo apt -f install)"
echo "Lancer    :   emailor                      (ou via le menu « Recherche d'email »)"
