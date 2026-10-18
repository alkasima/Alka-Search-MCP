"""Build a deterministic, source-only Agensi skill ZIP (standard library only)."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parents[1]
source = root / "skills" / "alka-search"
output = root / "release" / "alka-search-1.0.1.zip"
files = ["SKILL.md", "references/setup.md", "LICENSE"]
output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
    for name in files:
        info = ZipInfo("alka-search/" + name, date_time=(2026, 10, 18, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (source / name).read_text(encoding="utf-8").encode("utf-8"))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert sorted(archive.namelist()) == sorted("alka-search/" + name for name in files)
print(output)
print("SHA256: " + hashlib.sha256(output.read_bytes()).hexdigest())
