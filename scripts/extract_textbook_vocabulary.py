"""Extract the textbook "Words in Each Unit" pages into a Qwerty dictionary.

The source PDFs use full-width Latin characters and a few private-use glyphs
for IPA symbols.  PyPDF preserves the reading order of the two-column pages
better than layout-based extraction, so this script normalizes that stream and
then groups entries by unit.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader


SECTION_TITLES = (
    "Preparing for the Topic",
    "Exploring the Topic",
    "Developing the Topic",
    "Wrapping Up the Topic",
)

PART_OF_SPEECH = re.compile(
    r"(?<![A-Za-z])(?:ordinal\s*num|modal\s+v|inf\s*\.\s*m|n|v|adj|adv|prep|pron|conj|det|num|excl|abbr|art|aux)\s*\.",
    re.IGNORECASE,
)

ENTRY_START = re.compile(
    r"^[∗*]?\s*(?P<name>[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3})(?![A-Za-z])\s*"
    r"(?=(?:/|(?:ordinal\s*num|modal\s+v|inf\s*\.\s*m|n|v|adj|adv|prep|pron|conj|det|num|excl|abbr|art|aux)\s*\.))",
    re.IGNORECASE,
)

UNIT_START = re.compile(r"^Unit\s+(\d+)\s*$", re.IGNORECASE)
PAGE_REFERENCE = re.compile(r"\(\s*\d(?:\s*\d)*\s*\)")


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    private_glyphs = {
        "\U00100c77": "ɑ",
        "\U00100c79": "ɡ",
        "\U00100c7a": "θ",
        "\U00100c7b": "ŋ",
        "\U001001b3": "'",
    }
    for private_glyph, replacement in private_glyphs.items():
        text = text.replace(private_glyph * 2, replacement).replace(private_glyph, replacement)
    return (
        text.replace("⁃", "-")
        .replace("−", "-")
        .replace("\u00a0", " ")
    )


def clean_phone(phone: str) -> str:
    phone = normalize_text(phone)
    phone = phone.replace("I", "ɪ")
    phone = re.sub(r"\s+", "", phone)
    phone = phone.replace("(r)", "(r)")
    return phone.strip(" ;")


def clean_translation(value: str) -> str:
    value = PAGE_REFERENCE.sub("", value)
    value = re.sub(
        r"/\s*([^/]+?)\s*/",
        lambda match: " " if not re.search(r"[\u4e00-\u9fff]", match.group(1)) else match.group(0),
        value,
    )
    for title in SECTION_TITLES:
        value = value.replace(title, "")
    value = re.sub(r"\b\d{3}\s+Words in Each Unit\b", "", value)
    value = re.sub(r"\bWords in Each Unit\s+\d{3}\b", "", value)
    value = re.sub(r"\s+([,;:.!?])", r"\1", value)
    value = re.sub(r"([,;:(])\s+", r"\1", value)
    value = re.sub(r"\s+\)", ")", value)
    value = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", value)
    value = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[,;，；。)])", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" ;")


def parse_entry(name: str, raw_parts: list[str]) -> dict[str, object]:
    name = {"ha ppen": "happen"}.get(name, name)
    raw = normalize_text(" ".join(raw_parts))
    raw = raw.lstrip("∗* ")
    raw = raw[len(name) :].strip()
    raw = re.sub(r"\bWords in Each Unit\b", " ", raw)

    pos_match = PART_OF_SPEECH.search(raw)
    if pos_match:
        pronunciation = raw[: pos_match.start()].strip()
        translation = clean_translation(raw[pos_match.start() :])
    else:
        fallback_phones = list(re.finditer(r"/\s*([^/]+?)\s*/", raw))
        if not fallback_phones:
            raise ValueError(f"No part of speech found for {name!r}: {raw}")
        pronunciation = raw[: fallback_phones[-1].end()].strip()
        translation = clean_translation(raw[fallback_phones[-1].end() :])
    phone_matches = list(re.finditer(r"/\s*([^/]+?)\s*/", pronunciation))

    uk_phone = clean_phone(phone_matches[0].group(1)) if phone_matches else ""
    us_phone = uk_phone
    if len(phone_matches) > 1:
        separator = pronunciation[phone_matches[0].end() : phone_matches[1].start()]
        if ";" in separator:
            us_phone = clean_phone(phone_matches[1].group(1))

    return {
        "name": name,
        "trans": [translation],
        "usphone": us_phone,
        "ukphone": uk_phone,
    }


def extract(pdf_path: Path) -> tuple[list[dict[str, object]], list[dict[str, int | str]]]:
    reader = PdfReader(str(pdf_path))
    lines: list[str] = []
    for page in reader.pages:
        page_text = normalize_text(page.extract_text() or "")
        lines.extend(line.strip() for line in page_text.splitlines())

    # PyPDF occasionally splits a word at an unexpected text-object boundary,
    # for example "wo" + "uld /wʊd/". Repair only short, standalone fragments.
    repaired: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if (
            re.fullmatch(r"[A-Za-z]{1,3}", line)
            and index + 1 < len(lines)
            and re.match(r"^[a-z]{1,6}\s*/", lines[index + 1])
        ):
            repaired.append(line + lines[index + 1])
            index += 2
            continue
        repaired.append(line)
        index += 1

    words: list[dict[str, object]] = []
    chapter_starts: list[tuple[int, int]] = []
    current_name: str | None = None
    current_parts: list[str] = []

    def flush_entry() -> None:
        nonlocal current_name, current_parts
        if current_name:
            words.append(parse_entry(current_name, current_parts))
        current_name = None
        current_parts = []

    for line in repaired:
        if not line:
            continue

        unit_match = UNIT_START.match(line)
        if unit_match:
            flush_entry()
            chapter_starts.append((int(unit_match.group(1)), len(words)))
            continue

        if line in SECTION_TITLES or line == "Words in Each Unit" or line.isdigit():
            continue
        if line.startswith("注:") or line.startswith("说明:"):
            continue

        entry_match = ENTRY_START.match(line)
        if entry_match and current_name:
            current_raw = " ".join(current_parts)
            if not PART_OF_SPEECH.search(current_raw) and current_raw.count("/") % 2 == 1:
                entry_match = None
        if entry_match and entry_match.group("name").lower() in {"ordinal", "modal", "inf", "aux"}:
            entry_match = None
        if entry_match:
            flush_entry()
            current_name = entry_match.group("name").strip()
            current_parts = [line]
        elif current_name:
            current_parts.append(line)

    flush_entry()

    chapters: list[dict[str, int | str]] = []
    for position, (unit_number, start) in enumerate(chapter_starts):
        end = chapter_starts[position + 1][1] if position + 1 < len(chapter_starts) else len(words)
        chapters.append({"name": f"Unit {unit_number}", "start": start, "end": end})

    return words, chapters


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--chapters-output", type=Path)
    args = parser.parse_args()

    words, chapters = extract(args.pdf)
    args.output.write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.chapters_output:
        args.chapters_output.write_text(json.dumps(chapters, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Extracted {len(words)} words")
    for chapter in chapters:
        print(f"{chapter['name']}: {chapter['start']}..{chapter['end']} ({chapter['end'] - chapter['start']})")


if __name__ == "__main__":
    main()
