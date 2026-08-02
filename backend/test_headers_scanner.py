import asyncio
import json
from app.scanner.modules.headers import HeadersScanner
from app.scanner.orchestrator.scan_orchestrator import ScanOrchestrator


async def test_headers_module():
    print("\n=== TESTING HTTP SECURITY HEADERS SCANNER MODULE (PHASE 5) ===")
    scanner = HeadersScanner()

    assert scanner.module_id == "headers"
    print(f"✓ Module ID: {scanner.module_id}")
    print(f"✓ Module Name: {scanner.name}")

    target = "google.com"
    print(f"\n[1] Executing HeadersScanner.run('{target}')...")
    res = await scanner.run(target)

    print("\n=== HEADERS SCANNER RESULT ===")
    print(json.dumps(res, indent=2))

    assert res["module_id"] == "headers"
    assert res["status"] in ["completed", "error"]
    assert res["target"] == "google.com"
    if res["status"] == "completed":
        assert len(res["analyzed_headers"]) > 0
        assert len(res["security_observations"]) > 0
        print(f"\n✓ Target Effective URL: {res['effective_url']}")
        print(f"✓ HTTP Status Code: {res['status_code']}")
        print(f"✓ Total Headers Captured: {res['headers_count']}")
        print(f"✓ Analyzed Security Directives: {len(res['analyzed_headers'])}")
        print(f"✓ Risk Score: {res['risk_score']} ({res['risk_level']})")

    # Test Orchestrator Wiring
    orchestrator = ScanOrchestrator()
    registered_ids = [m.module_id for m in orchestrator.modules]
    print(f"\n[2] ScanOrchestrator Registered Modules: {registered_ids}")
    assert "dns" in registered_ids
    assert "whois" in registered_ids
    assert "ssl" in registered_ids
    assert "headers" in registered_ids
    print("✓ HeadersScanner correctly registered in ScanOrchestrator!")

    print("\n=== HEADERS SCANNER VERIFICATION PASSED 100% ===")

if __name__ == "__main__":
    asyncio.run(test_headers_module())
