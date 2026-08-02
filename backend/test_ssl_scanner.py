import asyncio
import json
from app.scanner.modules.ssl import SSLScanner
from app.scanner.orchestrator.scan_orchestrator import ScanOrchestrator


async def test_ssl_module():
    print("\n=== TESTING SSL SCANNER MODULE (PHASE 4) ===")
    scanner = SSLScanner()

    assert scanner.module_id == "ssl"
    print(f"✓ Module ID: {scanner.module_id}")
    print(f"✓ Module Name: {scanner.name}")

    target = "google.com"
    print(f"\n[1] Executing SSLScanner.run('{target}')...")
    res = await scanner.run(target)

    print("\n=== SSL SCANNER RESULT ===")
    print(json.dumps(res, indent=2))

    assert res["module_id"] == "ssl"
    assert res["status"] in ["completed", "error"]
    assert res["target"] == "google.com"
    if res["is_valid"]:
        assert res["certificate"] is not None
        assert res["protocol"] is not None
        assert res["certificate"]["subject_cn"] is not None
        assert res["certificate"]["signature_algorithm"] is not None
        assert len(res["security_observations"]) > 0
        print(f"\n✓ Certificate Subject CN: {res['certificate']['subject_cn']}")
        print(f"✓ Certificate Issuer Org: {res['certificate']['issuer_organization']}")
        print(f"✓ Days Until Expiration: {res['certificate']['days_until_expiration']}")
        print(f"✓ Signature Algorithm: {res['certificate']['signature_algorithm']}")
        print(f"✓ Protocol Version: {res['protocol']['protocol_version']}")
        print(f"✓ Cipher Suite: {res['protocol']['cipher_name']}")
        print(f"✓ Risk Score: {res['risk_score']} ({res['risk_level']})")

    # Test Orchestrator Wiring
    orchestrator = ScanOrchestrator()
    registered_ids = [m.module_id for m in orchestrator.modules]
    print(f"\n[2] ScanOrchestrator Registered Modules: {registered_ids}")
    assert "dns" in registered_ids
    assert "whois" in registered_ids
    assert "ssl" in registered_ids
    print("✓ SSLScanner correctly registered in ScanOrchestrator!")

    print("\n=== SSL SCANNER VERIFICATION PASSED 100% ===")

if __name__ == "__main__":
    asyncio.run(test_ssl_module())
