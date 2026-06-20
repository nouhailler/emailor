"""Connecteurs vers les API tierces de recherche & vérification d'email.

Appelés **depuis le processus natif** (jamais le navigateur) : la clé API reste
côté machine, pas de CORS, et — surtout — la vérification SMTP est faite par
l'infrastructure du fournisseur, donc **insensible au blocage du port 25 sortant**
(VPN / FAI) qui empêche la sonde locale.

Trois fournisseurs :
- **Hunter.io** — recherche (email-finder, avec sources réelles) + vérification.
- **Abstract** — validation de délivrabilité (quality_score, catch-all…).
- **ZeroBounce** — validation riche (status / sub_status).

Toutes les réponses sont normalisées vers le même vocabulaire que la sonde SMTP
locale (statuts : deliverable / undeliverable / catch_all / unknown / no_mx /
invalid_syntax / provider_error), pour que l'UI et le score restent identiques.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

_EMAIL_OK = lambda e: "@" in e and "." in e.split("@")[-1] and " " not in e  # noqa: E731


def _get_json(url: str, timeout: float = 20.0) -> tuple[dict, int]:
    """GET JSON. Renvoie (corps, code HTTP). Lève sur erreur réseau."""
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": "Emailor"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r), r.status
    except urllib.error.HTTPError as e:  # 4xx/5xx avec corps JSON exploitable
        try:
            return json.load(e), e.code
        except Exception:
            return {"_raw": e.read().decode("utf-8", "replace")[:300]}, e.code


# --------------------------------------------------------------------------- #
# Vérification de délivrabilité
# --------------------------------------------------------------------------- #

def _verify_hunter(email: str, key: str, tr) -> dict:
    url = "https://api.hunter.io/v2/email-verifier?" + urllib.parse.urlencode({"email": email, "api_key": key})
    tr("GET api.hunter.io/v2/email-verifier")
    body, code = _get_json(url)
    if code != 200:
        msg = (((body.get("errors") or [{}])[0]).get("details")) or f"HTTP {code}"
        tr(f"← erreur Hunter : {msg}")
        return {"status": "provider_error", "message": f"Hunter : {msg}"}
    d = body.get("data") or {}
    result = (d.get("result") or "").lower()       # deliverable / undeliverable / risky / unknown
    accept_all = bool(d.get("accept_all"))
    status = {
        "deliverable": "deliverable",
        "undeliverable": "undeliverable",
        "risky": "catch_all" if accept_all else "unknown",
        "unknown": "unknown",
    }.get(result, "unknown")
    mx = (d.get("mx_records") and "présents") or None
    tr(f"← Hunter result={result} score={d.get('score')} accept_all={accept_all}")
    return {
        "status": status,
        "score": d.get("score"),
        "catch_all": accept_all,
        "mx": d.get("mx_records") and "MX présents" or None,
        "message": f"Hunter : {result or 'inconnu'} (score {d.get('score', '?')}).",
    }


def _verify_abstract(email: str, key: str, tr) -> dict:
    url = "https://emailvalidation.abstractapi.com/v1/?" + urllib.parse.urlencode({"api_key": key, "email": email})
    tr("GET emailvalidation.abstractapi.com/v1")
    body, code = _get_json(url)
    if code != 200 or "deliverability" not in body:
        msg = body.get("error", {}).get("message") if isinstance(body.get("error"), dict) else f"HTTP {code}"
        tr(f"← erreur Abstract : {msg}")
        return {"status": "provider_error", "message": f"Abstract : {msg}"}

    def val(k):  # les champs Abstract sont {value, text}
        v = body.get(k)
        return v.get("value") if isinstance(v, dict) else v

    deliver = (body.get("deliverability") or "").upper()  # DELIVERABLE / UNDELIVERABLE / UNKNOWN
    catch_all = bool(val("is_catchall_email"))
    mx_found = bool(val("is_mx_found"))
    if not mx_found:
        status = "no_mx"
    elif deliver == "DELIVERABLE":
        status = "deliverable"
    elif deliver == "UNDELIVERABLE":
        status = "undeliverable"
    elif catch_all:
        status = "catch_all"
    else:
        status = "unknown"
    score100 = round(float(body.get("quality_score") or 0) * 100)
    tr(f"← Abstract deliverability={deliver} catch_all={catch_all} quality={body.get('quality_score')}")
    return {
        "status": status,
        "score": score100,
        "catch_all": catch_all,
        "mx": "MX présents" if mx_found else None,
        "message": f"Abstract : {deliver.lower() or 'inconnu'} (qualité {score100} %).",
    }


def _verify_zerobounce(email: str, key: str, tr) -> dict:
    url = "https://api.zerobounce.net/v2/validate?" + urllib.parse.urlencode(
        {"api_key": key, "email": email, "ip_address": ""}
    )
    tr("GET api.zerobounce.net/v2/validate")
    body, code = _get_json(url)
    if code != 200 or not body.get("status"):
        msg = body.get("error") or f"HTTP {code}"
        tr(f"← erreur ZeroBounce : {msg}")
        return {"status": "provider_error", "message": f"ZeroBounce : {msg}"}
    zb = (body.get("status") or "").lower()  # valid/invalid/catch-all/unknown/spamtrap/abuse/do_not_mail
    status = {
        "valid": "deliverable",
        "invalid": "undeliverable",
        "catch-all": "catch_all",
        "spamtrap": "undeliverable",
        "abuse": "undeliverable",
        "do_not_mail": "undeliverable",
        "unknown": "unknown",
    }.get(zb, "unknown")
    catch_all = zb == "catch-all"
    mx_found = str(body.get("mx_found")).lower() == "true"
    tr(f"← ZeroBounce status={zb} sub={body.get('sub_status')} mx_found={mx_found}")
    return {
        "status": "no_mx" if (not mx_found and zb in ("invalid", "unknown")) else status,
        "catch_all": catch_all,
        "mx": body.get("mx_record") or ("MX présents" if mx_found else None),
        "message": f"ZeroBounce : {zb}" + (f" · {body.get('sub_status')}" if body.get("sub_status") else "") + ".",
    }


_VERIFIERS = {"hunter": _verify_hunter, "abstract": _verify_abstract, "zerobounce": _verify_zerobounce}


def verify(provider: str, email: str, key: str) -> dict:
    """Vérifie une adresse via le fournisseur demandé. Réponse JSON normalisée."""
    t0 = time.time()
    trace: list[str] = []

    def tr(m: str) -> None:
        trace.append(f"{(time.time() - t0) * 1000:8.1f} ms  {m}")

    email = (email or "").strip()
    domain = email.split("@")[1] if "@" in email else ""
    base = {"provider": provider, "email": email, "domain": domain, "trace": trace}
    tr(f"vérification {provider} de {email!r}")
    if not _EMAIL_OK(email):
        return {**base, "status": "invalid_syntax", "message": "Syntaxe d'adresse invalide."}
    if not (key or "").strip():
        return {**base, "status": "provider_error", "message": f"Clé API {provider} manquante."}
    fn = _VERIFIERS.get(provider)
    if not fn:
        return {**base, "status": "provider_error", "message": f"Fournisseur inconnu : {provider}."}
    try:
        out = fn(email, key, tr)
    except Exception as e:  # réseau, JSON, etc.
        tr(f"✗ exception : {e}")
        return {**base, "status": "provider_error", "message": f"{provider} injoignable : {e}"}
    tr(f"verdict = {out.get('status')}")
    return {**base, **out}


# --------------------------------------------------------------------------- #
# Recherche d'email (Hunter Email Finder)
# --------------------------------------------------------------------------- #

def _humanize_pattern(pattern: str | None) -> str:
    if not pattern:
        return "prénom.nom"
    return (
        pattern.replace("{first}", "prénom")
        .replace("{last}", "nom")
        .replace("{f}", "p")
        .replace("{l}", "n")
    )


def find(source: str, domain: str, company: str, first: str, last: str, key: str) -> dict:
    """Recherche l'email le plus probable (Hunter Email Finder). Réponse normalisée
    avec **sources réelles** (pages où l'adresse a été observée)."""
    t0 = time.time()
    trace: list[str] = []

    def tr(m: str) -> None:
        trace.append(f"{(time.time() - t0) * 1000:8.1f} ms  {m}")

    base = {"source": source, "found": False, "trace": trace}
    if source != "hunter":
        return {**base, "message": f"Source de recherche inconnue : {source}."}
    if not (key or "").strip():
        return {**base, "message": "Clé API Hunter manquante."}
    if not (first and last):
        return {**base, "message": "Prénom et nom requis pour la recherche Hunter."}

    params = {"api_key": key, "first_name": first, "last_name": last}
    if domain:
        params["domain"] = domain
    elif company:
        params["company"] = company
    else:
        return {**base, "message": "Domaine ou société requis pour la recherche Hunter."}

    tr(f"GET api.hunter.io/v2/email-finder ({domain or company}, {first} {last})")
    try:
        body, code = _get_json("https://api.hunter.io/v2/email-finder?" + urllib.parse.urlencode(params))
    except Exception as e:
        tr(f"✗ exception : {e}")
        return {**base, "message": f"Hunter injoignable : {e}"}

    if code != 200:
        msg = (((body.get("errors") or [{}])[0]).get("details")) or f"HTTP {code}"
        tr(f"← erreur Hunter : {msg}")
        return {**base, "message": f"Hunter : {msg}"}

    d = body.get("data") or {}
    email = d.get("email")
    if not email:
        tr("← aucune adresse trouvée")
        return {**base, "message": "Hunter n'a trouvé aucune adresse pour cette personne."}

    sources = []
    for s in (d.get("sources") or [])[:8]:
        dom = s.get("domain") or ""
        seen = s.get("last_seen_on") or s.get("extracted_on") or ""
        sources.append({"label": dom, "detail": (s.get("uri") or dom) + (f" · {seen}" if seen else "")})

    tr(f"← email={email} score={d.get('score')} sources={len(sources)}")
    return {
        "source": "hunter",
        "found": True,
        "email": email,
        "score": d.get("score"),
        "domain": d.get("domain") or (email.split("@")[1] if "@" in email else ""),
        "pattern": _humanize_pattern(d.get("pattern")),
        "position": d.get("position") or "",
        "company": d.get("company") or company or "",
        "sources": sources,
        "trace": trace,
    }


if __name__ == "__main__":  # tests manuels
    import sys

    if len(sys.argv) >= 4 and sys.argv[1] == "verify":
        print(json.dumps(verify(sys.argv[2], sys.argv[3], sys.argv[4]), indent=2, ensure_ascii=False))
    elif len(sys.argv) >= 6 and sys.argv[1] == "find":
        print(
            json.dumps(
                find("hunter", sys.argv[2], "", sys.argv[3], sys.argv[4], sys.argv[5]),
                indent=2,
                ensure_ascii=False,
            )
        )
    else:
        print("usage: providers.py verify <hunter|abstract|zerobounce> <email> <key>")
        print("       providers.py find <domain> <first> <last> <hunter_key>")
