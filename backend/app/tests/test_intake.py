import pytest
from app.intake import prepare, redact, normalize, make_hash, IntakeError


@pytest.mark.parametrize("raw", [
    "call me on 9876543210 now",
    "call me on +91 98765 43210 now",
    "call me on 098765-43210 now",
    "call +1 (415) 555-2671 today",
    "whatsapp 91-9876543210 please",
])
def test_phone_redacted(raw):
    out, counts = redact(raw)
    assert "[phone]" in out and counts == {"phone": 1}
    

@pytest.mark.parametrize("raw", [
    "The scheme runs 2024-2025 and costs 5,00,000 crore",
    "On 15/08/2026 the PM said 1947 was key",
    "Order 12345 was cancelled",
])
def test_numbers_not_redacted(raw):
    out, counts = redact(raw)
    assert out == raw and counts == {}


def test_email_redacted():
    out, counts = redact("write to john.doe+x@mail.example.co.in for details")
    assert out == "write to [email] for details" and counts == {"email": 1}


def test_aadhaar_redacted():
    out, counts = redact("my id 1234 5678 9012 is here")
    assert "[id-number]" in out and counts == {"id_number": 1}


def test_normalize_whitespace_and_invisible():
    assert normalize("  hello\u200b   world \r\n\r\n\r\n\r\nbye ") == "hello world\n\nbye"


def test_hash_stable():
    assert make_hash("Is this TRUE?") == make_hash("  is this   true ")
    assert make_hash("a claim") != make_hash("another claim")


def test_too_long():
    with pytest.raises(IntakeError):
        prepare("x" * 2001)


def test_too_short_or_only_pii():
    with pytest.raises(IntakeError):
        prepare("hi")
    with pytest.raises(IntakeError):
        prepare("9876543210")


def test_language_detection():
    assert prepare("यह खबर पूरी तरह सही है क्या").lang == "hi"
    assert prepare("এই খবরটি কি সত্যি আসলেই").lang == "bn"
    assert prepare("This news is going around today", "hi").lang == "hi"
    assert prepare("This news is going around today", "xx").lang == "en"