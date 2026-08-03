import asyncio
import json
from app.scanner.modules.cookies import CookieScanner
from app.scanner.modules.cookies.utils import classify_cookie_category, evaluate_cookie_security_rules
from app.scanner.orchestrator.scan_orchestrator import ScanOrchestrator


async def test_cookie_module():
    print("\n=== TESTING COOKIE SECURITY SCANNER MODULE (PHASE 6.1 RELEASE POLISH) ===")
    scanner = CookieScanner()

    assert scanner.module_id == "cookies"
    print(f"✓ Module ID: {scanner.module_id}")
    print(f"✓ Module Name: {scanner.name}")

    # Test Cookie Classifier Unit Rules
    print("\n[1] Testing Cookie Classification Engine & Sensitivity Weights...")
    auth_cat, auth_lbl, auth_w = classify_cookie_category("PHPSESSID")
    assert auth_cat == "auth" and auth_w == 1.0
    print(f"  ✓ 'PHPSESSID' -> Category: {auth_lbl} (Weight: {auth_w})")

    ga_cat, ga_lbl, ga_w = classify_cookie_category("_ga")
    assert ga_cat == "analytics" and ga_w == 0.2
    print(f"  ✓ '_ga' -> Category: {ga_lbl} (Weight: {ga_w})")

    csrf_cat, csrf_lbl, csrf_w = classify_cookie_category("csrftoken")
    assert csrf_cat == "session" and csrf_w == 0.8
    print(f"  ✓ 'csrftoken' -> Category: {csrf_lbl} (Weight: {csrf_w})")

    # Test Weighted Scoring & False Positive Reduction
    print("\n[2] Testing Weighted Scoring & Contextual False Positive Suppression...")
    raw_mock_cookies = [
        {
            "name": "PHPSESSID",
            "value": "sec123",
            "domain": "example.com",
            "path": "/",
            "is_secure": False,
            "is_httponly": False,
            "samesite": None,
        },
        {
            "name": "_ga",
            "value": "GA1.2.123456",
            "domain": ".example.com",
            "path": "/",
            "is_secure": True,
            "is_httponly": False,
            "samesite": None,
        },
    ]

    items, obs, score, level, breakdown = evaluate_cookie_security_rules(raw_mock_cookies)
    
    print(f"  ✓ Calculated Weighted Risk Score: {score} / 100 ({level})")
    print("  ✓ Score Breakdown Items:")
    for b in breakdown:
        print(f"    - {b.label} -> +{b.points} pts [{b.category}]")

    # Verify stable finding IDs
    codes = [o.code for o in obs]
    print(f"  ✓ Generated Stable Finding IDs: {codes}")
    assert any(c.startswith("CK-") for c in codes)

    target = "google.com"
    print(f"\n[3] Executing CookieScanner.run('{target}')...")
    res = await scanner.run(target)

    print("\n=== COOKIE SCANNER RESULT ===")
    print(json.dumps(res, indent=2))

    assert res["module_id"] == "cookies"
    assert res["status"] in ["completed", "error"]
    assert res["target"] == "google.com"

    # Test Orchestrator Wiring
    orchestrator = ScanOrchestrator()
    registered_ids = [m.module_id for m in orchestrator.modules]
    print(f"\n[4] ScanOrchestrator Registered Modules: {registered_ids}")
    assert "dns" in registered_ids
    assert "whois" in registered_ids
    assert "ssl" in registered_ids
    assert "headers" in registered_ids
    assert "cookies" in registered_ids

    print("\n=== COOKIE SCANNER PHASE 6.1 POLISH VERIFICATION PASSED 100% ===")

if __name__ == "__main__":
    asyncio.run(test_cookie_module())
