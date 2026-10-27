"""Bundle index.html, css/ and js/ into one self-contained HTML file.

Usage:  python3 tools/build_single.py
Output: dist/wingspan-pocket.html  (p5.js and Google Fonts still load from CDNs)
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "css/style.css").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="css/style.css">', "<style>\n" + css + "\n</style>")

    def inline(match):
        src = match.group(1)
        code = (ROOT / src).read_text(encoding="utf-8")
        return "<script>\n" + code + "\n</script>"

    html = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
    out = ROOT / "dist/wingspan-pocket.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"Wrote {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
