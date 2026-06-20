"""Vérification SMTP réelle d'une adresse email (technique « sans envoi »).

Possible uniquement depuis le processus natif (pas le navigateur) : on résout les MX
du domaine (via DNS-over-HTTPS), on ouvre une connexion SMTP et on déroule
HELO / MAIL FROM:<> / RCPT TO sans jamais envoyer de message, puis on lit le code de
réponse. On teste aussi une adresse aléatoire pour détecter un domaine « catch-all ».

⚠️ Limites honnêtes :
- Le port 25 sortant est souvent bloqué (FAI résidentiels) → statut « unreachable ».
- Microsoft 365 / Google / Proofpoint répondent souvent 250 à tout le monde
  (anti-énumération) → détecté via le test catch-all, statut « catch_all ».
"""
from __future__ import annotations

import json
import random
import smtplib
import socket
import string
import time
import urllib.parse
import urllib.request

EMAIL_OK = lambda e: "@" in e and "." in e.split("@")[-1] and " " not in e  # noqa: E731


def _decode(b) -> str:
    return b.decode("utf-8", "replace").strip() if isinstance(b, (bytes, bytearray)) else str(b)

_DOH = [
    "https://cloudflare-dns.com/dns-query",
    "https://dns.google/resolve",
]


def lookup_mx(domain: str, timeout: float = 6.0) -> list[tuple[int, str]]:
    """Renvoie les MX [(priorité, hôte)] triés, via DNS-over-HTTPS."""
    for base in _DOH:
        try:
            url = base + "?" + urllib.parse.urlencode({"name": domain, "type": "MX"})
            req = urllib.request.Request(url, headers={"accept": "application/dns-json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = json.load(r)
            mx = []
            for a in data.get("Answer") or []:
                if a.get("type") == 15:
                    parts = str(a.get("data", "")).split()
                    if len(parts) == 2:
                        mx.append((int(parts[0]), parts[1].rstrip(".")))
            mx.sort()
            if mx:
                return mx
        except Exception:
            continue
    return []


def _rand_local() -> str:
    return "zz" + "".join(random.choices(string.ascii_lowercase + string.digits, k=14))


def _interpret(code: int | None, catch_all: bool) -> str:
    if catch_all:
        return "catch_all"
    if code in (250, 251, 252):
        return "deliverable"
    if code in (550, 551, 553, 501, 502, 541, 554):
        return "undeliverable"
    return "unknown"


def _raw_port25_probe(host: str, timeout: float, tr) -> dict:
    """Diagnostic TCP brut du port 25, séparé de smtplib, pour distinguer les
    causes d'échec : refus (RST), timeout de connexion (paquets jetés), ou
    « connecté mais aucune bannière SMTP » = filtrage furtif en sortie (VPN/FAI).

    Renvoie {"ok": bool, "status": str|None, "banner": str|None}. status non None
    => échec terminal (on s'arrête là)."""
    tr(f"connexion TCP vers {host}:25 (timeout {timeout:.0f}s)…")
    t0 = time.time()
    try:
        raw = socket.create_connection((host, 25), timeout=timeout)
    except (socket.timeout, TimeoutError):
        tr("⏱ TIMEOUT de connexion : aucun SYN/ACK reçu → port 25 filtré en silence "
           "(paquets jetés, typique d'un VPN ou pare-feu sortant).")
        return {"ok": False, "status": "timeout", "banner": None}
    except ConnectionRefusedError:
        tr("⛔ connexion REFUSÉE (RST) → un équipement répond activement et bloque le port 25.")
        return {"ok": False, "status": "unreachable", "banner": None}
    except OSError as e:
        tr(f"⛔ erreur réseau à la connexion : {e}")
        return {"ok": False, "status": "unreachable", "banner": None}

    dt = (time.time() - t0) * 1000
    try:
        local = raw.getsockname()
        peer = raw.getpeername()
        tr(f"✓ TCP établi en {dt:.0f} ms (local {local[0]}:{local[1]} → distant {peer[0]}:{peer[1]})")
    except OSError:
        tr(f"✓ TCP établi en {dt:.0f} ms")

    # Lecture de la bannière SMTP (« 220 … »). Son absence sur un TCP ouvert est la
    # signature d'un filtrage furtif du port 25 (proxy transparent qui ouvre le SYN
    # mais ne relaie jamais les données).
    raw.settimeout(timeout)
    banner = None
    try:
        data = raw.recv(512)
        if data:
            banner = _decode(data)
            tr(f"← bannière SMTP : {banner}")
        else:
            tr("← le serveur a fermé la connexion sans bannière → port 25 filtré en sortie.")
            try:
                raw.close()
            except OSError:
                pass
            return {"ok": False, "status": "timeout", "banner": None}
    except (socket.timeout, TimeoutError):
        tr("⏱ TCP ouvert mais AUCUNE bannière SMTP avant expiration → "
           "filtrage FURTIF du port 25 (le SYN passe, les données SMTP sont bloquées). "
           "Cause typique : VPN, ou inspection réseau de l'hôte/FAI.")
        try:
            raw.close()
        except OSError:
            pass
        return {"ok": False, "status": "timeout", "banner": None}
    except OSError as e:
        tr(f"erreur de lecture de la bannière : {e}")
    finally:
        try:
            raw.close()
        except OSError:
            pass
    return {"ok": True, "status": None, "banner": banner}


def verify_email(email: str, timeout: float = 12.0) -> dict:
    """Vérifie une adresse en SMTP. Renvoie un dict JSON-sérialisable incluant une
    trace détaillée (DNS → TCP:25 → dialogue SMTP) à des fins de diagnostic."""
    t0 = time.time()
    trace: list[str] = []

    def tr(msg: str) -> None:
        trace.append(f"{(time.time() - t0) * 1000:8.1f} ms  {msg}")

    email = (email or "").strip()
    tr(f"cible = {email!r}")
    if not EMAIL_OK(email):
        tr("syntaxe d'adresse invalide → arrêt")
        return {"status": "invalid_syntax", "email": email, "trace": trace,
                "message": "Syntaxe d'adresse invalide."}

    domain = email.split("@")[1]
    tr(f"résolution MX de {domain} via DNS-over-HTTPS…")
    mx = lookup_mx(domain)
    if not mx:
        tr("aucun enregistrement MX → le domaine ne reçoit pas d'emails")
        return {
            "status": "no_mx",
            "email": email,
            "domain": domain,
            "trace": trace,
            "message": "Aucun enregistrement MX — le domaine ne reçoit pas d'emails.",
        }

    tr("MX (par priorité) : " + ", ".join(f"{p} {h}" for p, h in mx))
    host = mx[0][1]
    base = {"email": email, "domain": domain, "mx": host}

    # Étape 1 — diagnostic TCP brut du port 25 (isole précisément la cause d'échec).
    probe = _raw_port25_probe(host, timeout, tr)
    if not probe["ok"]:
        msg = {
            "timeout": "Port 25 sortant filtré (pas de bannière SMTP). Souvent dû à un VPN ou au FAI.",
            "unreachable": "MX injoignable sur le port 25 — bloqué activement (RST/erreur réseau).",
        }.get(probe["status"], "Port 25 inaccessible.")
        return {**base, "status": probe["status"], "trace": trace, "message": msg}

    # Étape 2 — dialogue SMTP complet (sans jamais envoyer de message).
    tr("dialogue SMTP : HELO → MAIL FROM:<> → RCPT TO (sans envoi)…")
    try:
        smtp = smtplib.SMTP(timeout=timeout)
        code_c, msg_c = smtp.connect(host, 25)
        tr(f"← CONNECT {code_c} {_decode(msg_c)}")
        smtp.ehlo_or_helo_if_needed()
        tr(f"→ EHLO/HELO envoyé (esmtp={getattr(smtp, 'does_esmtp', '?')})")

        smtp.mail("")  # MAIL FROM:<> (expéditeur nul, standard pour la vérification)
        tr("→ MAIL FROM:<> accepté")
        code, msg = smtp.rcpt(email)
        tr(f"← RCPT TO:<{email}> → {code} {_decode(msg)}")

        # Détection catch-all : une adresse aléatoire est-elle aussi acceptée ?
        code_cat = None
        rand = _rand_local() + "@" + domain
        try:
            smtp.rset()
            smtp.mail("")
            code_cat, msg_cat = smtp.rcpt(rand)
            tr(f"← RCPT TO (adresse bidon {rand}) → {code_cat} {_decode(msg_cat)}")
        except smtplib.SMTPException as e:
            tr(f"test catch-all interrompu : {e}")

        try:
            smtp.quit()
        except smtplib.SMTPException:
            pass

        catch_all = code_cat in (250, 251, 252)
        status = _interpret(code, catch_all)
        tr(f"verdict = {status}" + (" (catch-all / anti-énumération)" if catch_all else ""))
        return {
            **base,
            "status": status,
            "code": code,
            "code_catchall": code_cat,
            "catch_all": catch_all,
            "trace": trace,
            "message": _decode(msg),
        }
    except (socket.timeout, TimeoutError):
        tr("⏱ délai dépassé pendant le dialogue SMTP")
        return {**base, "status": "timeout", "trace": trace,
                "message": "Délai dépassé pendant le dialogue SMTP — port 25 probablement filtré."}
    except (ConnectionRefusedError, OSError) as e:
        tr(f"⛔ connexion perdue pendant le dialogue : {e}")
        return {
            **base,
            "status": "unreachable",
            "trace": trace,
            "message": f"MX injoignable sur le port 25 ({e}). Ce port sortant est souvent bloqué.",
        }
    except smtplib.SMTPException as e:
        tr(f"erreur SMTP : {e}")
        return {**base, "status": "smtp_error", "trace": trace, "message": f"Erreur SMTP : {e}"}


if __name__ == "__main__":  # test manuel : python3 smtp_verify.py user@domain.com
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else "postmaster@gmail.com"
    print(json.dumps(verify_email(target), indent=2, ensure_ascii=False))
