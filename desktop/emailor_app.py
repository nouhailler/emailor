#!/usr/bin/env python3
"""Lanceur desktop natif pour Emailor (Debian / GNOME).

Aucune dépendance navigateur : on sert le build `dist/` sur 127.0.0.1 (en interne,
invisible) et on l'affiche dans une fenêtre **GTK native** via le webview système
WebKit2GTK — déjà présent sur GNOME. Le code React n'est pas modifié.

Persistance : la clé API OpenRouter, le modèle et les réglages (localStorage) sont
stockés dans ~/.local/share/emailor, donc conservés d'un lancement à l'autre.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import threading
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler

import gi

gi.require_version("Gtk", "3.0")
try:
    gi.require_version("WebKit2", "4.1")
except ValueError:  # repli si seule la 4.0 est disponible
    gi.require_version("WebKit2", "4.0")
from gi.repository import GLib, Gtk, WebKit2  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, "desktop")
DIST = os.path.join(ROOT, "dist")
ICON = os.path.join(HERE, "emailor.svg")
DATA_DIR = os.path.join(GLib.get_user_data_dir(), "emailor")


class _QuietHandler(SimpleHTTPRequestHandler):
    """Sert `dist/` sans rien journaliser sur stderr."""

    def log_message(self, *_args):  # noqa: D401 - silence
        pass


def ensure_build() -> bool:
    """Garantit la présence d'un build. Le construit avec npm si nécessaire."""
    if os.path.exists(os.path.join(DIST, "index.html")):
        return True
    npm = shutil.which("npm")
    if not npm:
        return False
    print("Build introuvable — exécution de « npm run build »…")
    if not os.path.isdir(os.path.join(ROOT, "node_modules")):
        subprocess.run([npm, "install"], cwd=ROOT, check=True)
    subprocess.run([npm, "run", "build"], cwd=ROOT, check=True)
    return os.path.exists(os.path.join(DIST, "index.html"))


def start_server() -> tuple[HTTPServer, int]:
    """Démarre un serveur HTTP local (port libre) servant `dist/`."""
    handler = partial(_QuietHandler, directory=DIST)
    httpd = HTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def make_webview() -> WebKit2.WebView:
    """WebView avec stockage persistant (localStorage conservé entre lancements)."""
    os.makedirs(DATA_DIR, exist_ok=True)
    manager = WebKit2.WebsiteDataManager(
        base_data_directory=DATA_DIR,
        base_cache_directory=os.path.join(DATA_DIR, "cache"),
    )
    context = WebKit2.WebContext.new_with_website_data_manager(manager)
    return WebKit2.WebView.new_with_context(context)


def fatal(message: str) -> None:
    dialog = Gtk.MessageDialog(
        message_type=Gtk.MessageType.ERROR,
        buttons=Gtk.ButtonsType.OK,
        text="Emailor — impossible de démarrer",
    )
    dialog.format_secondary_text(message)
    dialog.run()
    dialog.destroy()


def main() -> None:
    if not ensure_build():
        fatal(
            "Aucun build trouvé dans dist/ et npm est indisponible.\n"
            "Lancez « npm install && npm run build » puis relancez l'application."
        )
        return

    httpd, port = start_server()
    url = f"http://127.0.0.1:{port}/"

    webview = make_webview()
    webview.load_uri(url)

    window = Gtk.Window(title="Recherche d'email")
    window.set_default_size(1280, 820)
    if os.path.exists(ICON):
        try:
            window.set_icon_from_file(ICON)
        except GLib.Error:
            pass

    def on_quit(*_args):
        try:
            httpd.shutdown()
        except OSError:
            pass
        Gtk.main_quit()

    window.add(webview)
    window.connect("destroy", on_quit)
    window.show_all()

    # Ctrl+C dans le terminal ferme proprement l'application.
    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, 2, on_quit)

    Gtk.main()


if __name__ == "__main__":
    main()
