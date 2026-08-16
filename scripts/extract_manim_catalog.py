#!/usr/bin/env python3
"""Extract public class names from Manim sources with the stdlib ast module.

Never import or execute Manim. Join extracted names to the capability mapping.
"""

from __future__ import annotations

import argparse
import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAPPING_PATH = ROOT / "packages" / "visualization-schema" / "src" / "capabilities.json"
REPORT_PATH = ROOT / "docs" / "capability-report.md"


def public_classes(source: str, module: str) -> list[dict[str, str]]:
    tree = ast.parse(source)
    found: list[dict[str, str]] = []
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and not node.name.startswith("_"):
            bases = [ast.unparse(base) if hasattr(ast, "unparse") else getattr(base, "id", "") for base in node.bases]
            found.append({"name": node.name, "module": module, "bases": ", ".join(bases)})
    return found


def extract_catalog(manim_root: Path | None) -> list[dict[str, str]]:
    if manim_root is None or not manim_root.exists():
        return []
    catalog: list[dict[str, str]] = []
    for path in sorted(manim_root.rglob("*.py")):
        if path.name.startswith("_"):
            continue
        module = str(path.relative_to(manim_root).with_suffix("")).replace("/", ".")
        catalog.extend(public_classes(path.read_text(encoding="utf-8"), module))
    return catalog


def render_report(mapping: dict, catalog: list[dict[str, str]]) -> str:
    names = {item["name"] for item in catalog}
    lines = [
        "# Capability report",
        "",
        "Generated from `packages/visualization-schema/src/capabilities.json`.",
        "Catalog extraction parses Python with `ast` only; Manim is never imported.",
        "",
        f"Extracted public classes: {len(catalog)}",
        "",
        "| Type | Support | Browser 2D | Browser 3D | Export engine | CE target | ManimGL target |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for kind in mapping["kinds"]:
        lines.append(
            "| {type} | {support} | {browser2D} | {browser3D} | {exportEngine} | {exportTarget} | {manimGlTarget} |".format(
                type=kind["type"],
                support=kind["support"],
                browser2D="yes" if kind["browser2D"] else "no",
                browser3D="yes" if kind["browser3D"] else "no",
                exportEngine=kind["exportEngine"],
                exportTarget=kind["exportTarget"],
                manimGlTarget=kind["manimGlTarget"],
            )
        )
    lines.extend(["", "## Mapping notes", ""])
    if names:
        lines.append("Pinned tree contained: " + ", ".join(sorted(names)[:40]))
    else:
        lines.append(
            "No Manim source tree was provided. Mapping is the source of truth until a reviewed commit is vendored."
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manim-root", type=Path, default=None)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    mapping = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    catalog = extract_catalog(args.manim_root)
    report = render_report(mapping, catalog)
    if args.write:
        REPORT_PATH.write_text(report, encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
