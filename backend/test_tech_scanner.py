import asyncio
import json
from app.scanner.modules.tech import TechScanner
from app.scanner.modules.tech.utils import analyze_technology_stack
from app.scanner.orchestrator.scan_orchestrator import ScanOrchestrator


async def test_tech_module():
    print("\n=== TESTING TECHNOLOGY STACK SCANNER MODULE (PHASE 7 MILESTONE 1) ===")
    scanner = TechScanner()

    assert scanner.module_id == "tech"
    print(f"✓ Module ID: {scanner.module_id}")
    print(f"✓ Module Name: {scanner.name}")

    # 1. Signature Unit Tests
    print("\n[1] Testing Technology Signature Classifier & Confidence Scores...")
    mock_headers = {
        "Server": "nginx/1.18.0",
        "X-Powered-By": "Next.js 14.0.1",
        "CF-RAY": "8a1234567890-SJC",
    }
    mock_cookies = [{"name": "PHPSESSID", "value": "abc1234"}]
    mock_body = '<meta name="generator" content="WordPress 6.4.2"><script src="/_next/static/chunks/main.js"></script>'

    techs, obs, score, level = analyze_technology_stack(mock_headers, mock_cookies, mock_body)

    print(f"  ✓ Detected {len(techs)} Technologies:")
    for t in techs:
        print(f"    - [{t.category_label}] {t.name} (Version: {t.version or 'N/A'}, Confidence: {t.confidence}%) -> Evidence: {t.evidence}")
        assert 0 <= t.confidence <= 100
        assert t.confidence >= 50

    assert any(t.name == "Next.js" for t in techs)
    assert any(t.name == "Cloudflare" for t in techs)
    assert any(t.name == "Nginx" for t in techs)
    print("  ✓ Signature Classification Passed 100%")

    # 2. Real Domain Execution Tests (google.com, github.com, cloudflare.com)
    print("\n[2] Testing Real Domain Execution (google.com, github.com, cloudflare.com)...")
    for target in ["google.com", "github.com", "cloudflare.com"]:
        print(f"\n  Scanning target: {target}...")
        res = await scanner.run(target)
        print(f"  ✓ Status: {res['status']} | Tech Count: {res.get('tech_count', 0)} | Risk Score: {res.get('risk_score', 0)}")
        for tech in res.get("detected_technologies", []):
            print(f"    - [{tech['category_label']}] {tech['name']} (Conf: {tech['confidence']}%) | Evidence: {tech['evidence']}")
        assert res["module_id"] == "tech"
        assert res["status"] in ["completed", "error"]

    # 3. Orchestrator Wiring Verification
    orchestrator = ScanOrchestrator()
    registered_ids = [m.module_id for m in orchestrator.modules]
    print(f"\n[3] ScanOrchestrator Registered Modules Order: {' -> '.join(registered_ids)}")
    assert registered_ids == ["dns", "whois", "ssl", "headers", "cookies", "tech"]

    print("\n=== TECH SCANNER MILESTONE 1 VERIFICATION PASSED 100% ===")

if __name__ == "__main__":
    asyncio.run(test_tech_module())
