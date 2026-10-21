"""End-to-end smoke test through the public origin: health, pages, auth, data and key features.

Usage: python3 scripts/smoke.py [--url http://localhost:8080] [--mail-url http://localhost:8025]
Needs only the Python standard library. Signs in with the local demo account, so the target
must run with DEMO_MODE=true; it refuses any origin that is not a local address.
"""
import argparse
import http.cookiejar
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "app", "skillshare-app"}


class Client:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def csrf(self):
        return next((c.value for c in self.cookies if c.name == "csrftoken"), "")

    def request(self, method, path, body=None, csrf=True):
        headers = {"Accept": "application/json", "Referer": self.base + "/"}
        data = None
        if method != "GET" and csrf:
            headers["X-CSRFToken"] = self.csrf()
            if body is not None:
                data = json.dumps(body).encode()
                headers["Content-Type"] = "application/json"
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with self.opener.open(req, timeout=15) as response:
                return response.status, response.headers, response.read().decode(errors="replace")
        except urllib.error.HTTPError as error:
            return error.code, error.headers, error.read().decode(errors="replace")

    def json(self, method, path, body=None, expect=200):
        status, _, text = self.request(method, path, body)
        check(status == expect, f"{method} {path} returned {status}, expected {expect}: {text[:200]}")
        return json.loads(text) if text else None


passed = 0


def check(condition, message):
    if not condition:
        print(f"FAIL  {message}")
        sys.exit(1)


def step(name):
    global passed
    passed += 1
    print(f"ok    {name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--url", default="http://localhost:8080")
    parser.add_argument("--mail-url", default="http://localhost:8025")
    args = parser.parse_args()
    if urllib.parse.urlsplit(args.url).hostname not in LOCAL_HOSTS:
        sys.exit("Refusing to run: the smoke test signs in to demo data and only targets local origins.")
    c = Client(args.url)

    check(c.json("GET", "/api/health/live/")["status"], "liveness has no status")
    check(c.json("GET", "/api/health/ready/")["status"] == "ready", "database or Redis is not ready")
    step("health: live and ready (PostgreSQL + Redis)")

    status, headers, html = c.request("GET", "/")
    check(status == 200 and "<title>Illini SkillShare" in html, "landing page did not render the app shell")
    check("__APP_PUBLIC_URL__" not in html and "__APP_PUBLIC_URL__" not in c.request("GET", "/index.html")[2], "share tags were not filled in")
    check(c.request("GET", "/home")[1].get("X-Robots-Tag") == "noindex", "signed-in screens are indexable")
    check("Disallow: /api/" in c.request("GET", "/robots.txt")[2], "robots.txt is missing API rules")
    check(c.request("GET", "/og-image.png")[0] == 200, "share image is missing")
    step("pages: landing, share tags, robots.txt, noindex and share image")

    config = c.json("GET", "/api/auth/csrf/")
    check(config["demoEnabled"], "demo sign-in is off; start the app with DEMO_MODE=true (the default for make dev)")
    check(not config["authenticated"], "a fresh client already has a session")
    check(c.request("GET", "/api/auth/me/")[0] in (401, 403), "signed-out member lookup was not refused")
    check(c.request("POST", "/api/auth/demo/", csrf=False)[0] == 403, "demo sign-in accepted a request without a CSRF token")
    step("auth: config, signed-out refusal and CSRF enforcement")

    user = c.json("POST", "/api/auth/demo/")["user"]
    check(c.json("GET", "/api/auth/me/")["email"] == user["email"], "session cookie did not sign in")
    step(f"auth: one-click demo sign-in as {user['email']}")

    dashboard = c.json("GET", "/api/dashboard/")
    check(dashboard.get("attention_items"), "Home has nothing that needs attention")
    swaps = c.json("GET", "/api/discovery/swaps/")["results"]
    check(swaps, "no two-way swap matches")
    search = c.json("GET", "/api/discovery/search/?q=figma")
    check(search["count"] > 0, "keyword search found nobody who teaches Figma")
    inbox = c.json("GET", "/api/help-requests/?bucket=needs_action")
    check(inbox["count"] > 0, "requests inbox is empty")
    c.json("GET", "/api/notifications/")
    step(f"data: Home, {len(swaps)} swap matches, {search['count']} search results, {inbox['count']} requests needing action")

    detail = c.json("GET", f"/api/help-requests/{inbox['results'][0]['id']}/")
    check(detail["id"] == inbox["results"][0]["id"], "request detail did not load")
    target = swaps[0]["id"]
    saved = {row["saved_profile"]: row["id"] for row in c.json("GET", "/api/saved-profiles/")["results"]}
    if target in saved:
        c.json("DELETE", f"/api/saved-profiles/{saved[target]}/", expect=204)
    row = c.json("POST", "/api/saved-profiles/", {"saved_profile": target}, expect=201)
    c.json("DELETE", f"/api/saved-profiles/{row['id']}/", expect=204)
    if target in saved:
        c.json("POST", "/api/saved-profiles/", {"saved_profile": target}, expect=201)
    step("features: request detail and save/unsave a profile")

    c.json("POST", "/api/auth/logout/")
    check(c.request("GET", "/api/auth/me/")[0] in (401, 403), "session survived sign-out")
    step("auth: sign-out revokes the session")

    try:
        with urllib.request.urlopen(args.mail_url.rstrip("/") + "/api/v1/info", timeout=5) as response:
            check(response.status == 200, "local inbox did not answer")
        step("mail: local test inbox is reachable")
    except OSError:
        print(f"skip  mail: no local inbox at {args.mail_url}")

    print(f"Smoke test passed: {passed} checks against {args.url}")


if __name__ == "__main__":
    main()
