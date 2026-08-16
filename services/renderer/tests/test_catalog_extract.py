import importlib.util
from pathlib import Path

EXTRACTOR = Path(__file__).resolve().parents[3] / "scripts" / "extract_manim_catalog.py"


def _load_extractor():
    spec = importlib.util.spec_from_file_location("extract_manim_catalog", EXTRACTOR)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_extracts_public_classes_without_importing(tmp_path: Path) -> None:
    module_path = tmp_path / "mobject" / "functions.py"
    module_path.parent.mkdir(parents=True)
    source = (
        "class VMobject:\n"
        "    pass\n\n"
        "class FunctionGraph(VMobject):\n"
        "    '''graph'''\n\n"
        "class _Hidden:\n"
        "    pass\n"
    )
    module_path.write_text(source, encoding="utf-8")
    extractor = _load_extractor()
    catalog = extractor.extract_catalog(tmp_path)
    names = {item["name"] for item in catalog}
    assert "FunctionGraph" in names
    assert "_Hidden" not in names
    assert extractor.public_classes("class Foo:\n    pass\n", "demo")[0]["name"] == "Foo"
