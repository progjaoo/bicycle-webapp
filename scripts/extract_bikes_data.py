from __future__ import annotations

import json
import zipfile
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import xml.etree.ElementTree as ET

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_XLSX = PROJECT_ROOT / "PricesBH_2026_AED_Ajustado (1).xlsx"
OUTPUT_FILE = PROJECT_ROOT / "src" / "data" / "bikesData.js"

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SOURCE_MARKUP = Decimal("6.604993597951347")
SOURCE_RATE = Decimal("4.4")
DEFAULT_MARKUP = Decimal("6.604993597951347")
DEFAULT_MARGIN = Decimal("38.45655398547896")
DEFAULT_RATE = Decimal("4.4")


def load_shared_strings(workbook: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in workbook.namelist():
        return []

    root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall("a:si", NS):
        strings.append("".join(text.text or "" for text in item.iterfind(".//a:t", NS)))

    return strings


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        inline = cell.find("a:is", NS)
        if inline is None:
            return ""
        return "".join(text.text or "" for text in inline.iterfind(".//a:t", NS))
    if cell_type == "s":
        value = cell.find("a:v", NS)
        if value is None:
            return ""
        index = int(value.text)
        return shared_strings[index]

    value = cell.find("a:v", NS)
    return value.text if value is not None else ""


def to_base_euro(cost_value: str) -> float:
    divisor = (Decimal("1") + (SOURCE_MARKUP / Decimal("100"))) * SOURCE_RATE
    base_euro = Decimal(cost_value) / divisor
    rounded = base_euro.quantize(Decimal("0.000000000001"), rounding=ROUND_HALF_UP)
    return float(rounded)


def build_dataset() -> dict:
    workbook = zipfile.ZipFile(SOURCE_XLSX)
    shared_strings = load_shared_strings(workbook)
    worksheet = ET.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
    sheet_data = worksheet.find("a:sheetData", NS)
    if sheet_data is None:
        raise RuntimeError("Planilha sem sheetData.")

    categories = []
    current_category = None
    title = "BH 2026 (AED)"
    title_cell = "G1"

    for row in sheet_data.findall("a:row", NS):
        row_number = int(row.attrib["r"])
        cell_map = {
            cell.attrib["r"][:1]: cell_value(cell, shared_strings).strip() for cell in row.findall("a:c", NS)
        }

        for cell in row.findall("a:c", NS):
            raw_value = cell_value(cell, shared_strings).strip()
            if raw_value.startswith("BH 2026"):
                title = raw_value
                title_cell = cell.attrib["r"]

        if row_number < 3:
            continue

        code = cell_map.get("A", "")
        description = cell_map.get("B", "")
        specs = cell_map.get("C", "")
        sizes = cell_map.get("D", "")
        bhu = cell_map.get("E", "")
        sale = cell_map.get("F", "")
        cost = cell_map.get("G", "")

        is_category_row = code and not description and not specs and not sizes and not bhu
        if is_category_row:
            current_category = {
                "name": code,
                "templateRow": row_number,
                "items": [],
            }
            categories.append(current_category)
            continue

        if not current_category or not code:
            continue

        current_category["items"].append(
            {
                "templateRow": row_number,
                "code": code,
                "description": description,
                "specs": specs,
                "sizes": sizes,
                "bhu": bhu,
                "baseEuro": to_base_euro(cost),
                "defaultSale": float(sale) if sale else 0,
                "defaultCost": float(cost) if cost else 0,
            }
        )

    total_skus = sum(len(category["items"]) for category in categories)
    return {
        "sheetName": "Hoja1",
        "title": title,
        "titleCell": title_cell,
        "defaultParameters": {
            "markupCompra": float(DEFAULT_MARKUP),
            "margemVenda": float(DEFAULT_MARGIN),
            "taxaConversao": float(DEFAULT_RATE),
            "moedaDestino": "AED",
        },
        "totals": {
            "categories": len(categories),
            "skus": total_skus,
        },
        "categories": categories,
    }


def write_module(dataset: dict) -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    module_text = "export const bikesDataset = " + json.dumps(dataset, ensure_ascii=False, indent=2) + ";\n"
    OUTPUT_FILE.write_text(module_text, encoding="utf-8")


if __name__ == "__main__":
    write_module(build_dataset())
