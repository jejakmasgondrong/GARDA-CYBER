from app.services.secret_patterns import scan_content_for_secrets


def test_detects_aws_access_key():
    content = 'aws_key = "AKIAABCDEFGHIJKLMNOP"'
    results = scan_content_for_secrets(content)
    ids = [p.id for p, _, _ in results]
    assert "aws_access_key_id" in ids


def test_detects_github_pat():
    content = "token: ghp_" + "a" * 36
    results = scan_content_for_secrets(content)
    assert any(p.id == "github_pat" for p, _, _ in results)


def test_detects_private_key_header():
    content = "-----BEGIN RSA PRIVATE KEY-----\nMIIExyz\n-----END RSA PRIVATE KEY-----"
    results = scan_content_for_secrets(content)
    assert any(p.id == "private_key_header" for p, _, _ in results)


def test_no_false_positive_on_clean_code():
    content = "def add(a, b):\n    return a + b\n"
    assert scan_content_for_secrets(content) == []


def test_one_match_per_pattern_per_file():
    content = 'k1 = "AKIAABCDEFGHIJKLMNOP"\nk2 = "AKIAZZZZZZZZZZZZZZZZ"'
    results = scan_content_for_secrets(content)
    aws_matches = [r for r in results if r[0].id == "aws_access_key_id"]
    assert len(aws_matches) == 1  # bukan 2 -- cegah spam finding identik
