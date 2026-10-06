import hashlib
import os
import re
import unicodedata
from dataclasses import dataclass, field

MAX_CHARS = int(os.getenv("MAX_INPUT_CHARS", "2000"))
MIN_CHARS = 8
ALLOWED_LANGS = {"en", "hi", "bn"}


class IntakeError(ValueError):
    """Message is safe to show to the user."""


@dataclass
class Intake:
    text: str                      # normalized + redacted (this is what gets stored and analysed)
    lang: str
    text_hash: str
    redactions: dict = field(default_factory=dict)


# Zero-width space, word joiner, BOM. ZWJ/ZWNJ (200c/200d) are kept on purpose:
# Bengali and Hindi conjuncts need them.
_INVISIBLE = dict.fromkeys(map(ord, "\u200b\u2060\ufeff"), None)

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}")
AADHAAR_RE = re.compile(r"(?<!\d)\d{4}[ \-]\d{4}[ \-]\d{4}(?!\d)")
PHONE_CANDIDATE_RE = re.compile(r"(?<![\w.])\+?\d[\d\s().\-]{7,18}\d(?!\w)")


def normalize(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).translate(_INVISIBLE)
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t\u00a0]+", " ", t)
    t = re.sub(r" ?\n ?", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _is_phone(candidate: str) -> bool:
    digits = re.sub(r"\D", "", candidate)
    if candidate.startswith("+"):
        return 10 <= len(digits) <= 15
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return len(digits) == 10 and digits[0] in "6789"      # Indian mobile


def redact(text: str) -> tuple[str, dict]:
    counts = {"email": 0, "phone": 0, "id_number": 0}

    def sub_email(m):
        counts["email"] += 1
        return "[email]"

    def sub_aadhaar(m):
        counts["id_number"] += 1
        return "[id-number]"

    def sub_phone(m):
        if _is_phone(m.group()):
            counts["phone"] += 1
            return "[phone]"
        return m.group()

    text = EMAIL_RE.sub(sub_email, text)
    text = AADHAAR_RE.sub(sub_aadhaar, text)
    text = PHONE_CANDIDATE_RE.sub(sub_phone, text)
    return text, {k: v for k, v in counts.items() if v}


def detect_lang(text: str, hint: str | None = None) -> str:
    letters = [c for c in text if c.isalpha()]
    if letters:
        dev = sum("\u0900" <= c <= "\u097f" for c in letters) / len(letters)
        ben = sum("\u0980" <= c <= "\u09ff" for c in letters) / len(letters)
        if dev > 0.3:
            return "hi"
        if ben > 0.3:
            return "bn"
    return hint if hint in ALLOWED_LANGS else "en"


def make_hash(text: str) -> str:
    t = re.sub(r"\s+", " ", text.casefold()).strip(" .!?,;:।")
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


def prepare(raw: str, lang_hint: str | None = None) -> Intake:
    text = normalize(raw)
    if len(text) > MAX_CHARS:
        raise IntakeError(
            f"That message is too long ({len(text)} characters, max {MAX_CHARS}). "
            "Paste just the key claim you want checked."
        )
    text, counts = redact(text)
    meaningful = re.sub(r"\[(?:email|phone|id-number)\]|\s", "", text)
    if len(meaningful) < MIN_CHARS:
        raise IntakeError("That message is too short to check. Paste the full claim or forward.")
    return Intake(
        text=text,
        lang=detect_lang(text, lang_hint),
        text_hash=make_hash(text),
        redactions=counts,
    )