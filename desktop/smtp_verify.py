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
import urllib.parse
import urllib.request

EMAIL_OK = lambda e: "@" in e and "." in e.split("@")[-1] and " " not in e  # noqa: E731

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


def verify_email(email: str, timeout: float = 12.0) -> dict:
    """Vérifie une adresse en SMTP. Renvoie un dict JSON-sérialisable."""
    email = (email or "").strip()
    if not EMAIL_OK(email):
        return {"status": "invalid_syntax", "email": email, "message": "Syntaxe d'adresse invalide."}

    domain = email.split("@")[1]
    mx = lookup_mx(domain)
    if not mx:
        return {
            "status": "no_mx",
            "email": email,
            "domain": domain,
            "message": "Aucun enregistrement MX — le domaine ne reçoit pas d'emails.",
        }

    host = mx[0][1]
    base = {"email": email, "domain": domain, "mx": host}

    try:
        smtp = smtplib.SMTP(timeout=timeout)
        smtp.connect(host, 25)
        smtp.ehlo_or_helo_if_needed()

        smtp.mail("")  # MAIL FROM:<> (expéditeur nul, standard pour la vérification)
        code, msg = smtp.rcpt(email)

        # Détection catch-all : une adresse aléatoire est-elle aussi acceptée ?
        code_cat = None
        try:
            smtp.rset()
            smtp.mail("")
            code_cat, _ = smtp.rcpt(_rand_local() + "@" + domain)
        except smtplib.SMTPException:
            pass

        try:
            smtp.quit()
        except smtplib.SMTPException:
            pass

        catch_all = code_cat in (250, 251, 252)
        return {
            **base,
            "status": _interpret(code, catch_all),
            "code": code,
            "code_catchall": code_cat,
            "catch_all": catch_all,
            "message": msg.decode("utf-8", "replace") if isinstance(msg, bytes) else str(msg),
        }
    except (socket.timeout, TimeoutError):
        return {**base, "status": "timeout", "message": "Délai dépassé — le port 25 est probablement filtré."}
    except (ConnectionRefusedError, OSError) as e:
        return {
            **base,
            "status": "unreachable",
            "message": f"MX injoignable sur le port 25 ({e}). Ce port sortant est souvent bloqué par les FAI.",
        }
    except smtplib.SMTPException as e:
        return {**base, "status": "smtp_error", "message": f"Erreur SMTP : {e}"}


if __name__ == "__main__":  # test manuel : python3 smtp_verify.py user@domain.com
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else "postmaster@gmail.com"
    print(json.dumps(verify_email(target), indent=2, ensure_ascii=False))
