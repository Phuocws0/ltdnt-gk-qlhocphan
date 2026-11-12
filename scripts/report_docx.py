"""Build an editable Word report with one full-size caption per demo image."""

import re
from pathlib import Path

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from PIL import Image as PILImage


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "BAO_CAO.md"
OUTPUT = ROOT / "output" / "word" / "Bao-cao-QLHocPhan.docx"
LINES = SOURCE.read_text(encoding="utf-8").splitlines()
BODY = LINES[LINES.index("<!-- pagebreak -->") + 1 :]


def set_font(style, name, size, bold=False):
    style.font.name = name
    style.font.size = Pt(size)
    style.font.bold = bold
    style.font.color.rgb = RGBColor(0, 0, 0)
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.rFonts
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    for key in ("ascii", "hAnsi", "eastAsia", "cs"):
        rfonts.set(qn(f"w:{key}"), name)


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.27)
section.page_height = Inches(11.69)
section.top_margin = Inches(0.7)
section.bottom_margin = Inches(0.7)
section.left_margin = Inches(0.85)
section.right_margin = Inches(0.85)

normal = doc.styles["Normal"]
set_font(normal, "Times New Roman", 12)
normal.paragraph_format.line_spacing = 1.18
normal.paragraph_format.space_after = Pt(8)

title_style = doc.styles["Title"]
set_font(title_style, "Times New Roman", 20, True)
title_style.paragraph_format.space_after = Pt(12)
title_ppr = title_style.element.get_or_add_pPr()
title_border = title_ppr.find(qn("w:pBdr"))
if title_border is not None:
    title_ppr.remove(title_border)

for name, size, before, after in (
    ("Heading 1", 14, 13, 7),
    ("Heading 2", 12.5, 10, 5),
):
    style = doc.styles[name]
    set_font(style, "Times New Roman", size, True)
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)
    style.paragraph_format.keep_with_next = True

caption_style = doc.styles.add_style("Figure Caption", WD_STYLE_TYPE.PARAGRAPH)
set_font(caption_style, "Times New Roman", 11)
caption_style.paragraph_format.space_before = Pt(6)
caption_style.paragraph_format.space_after = Pt(8)
caption_style.paragraph_format.keep_together = True
caption_style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER

code_style = doc.styles.add_style("Code Text", WD_STYLE_TYPE.PARAGRAPH)
set_font(code_style, "Liberation Mono", 8.5)
code_style.paragraph_format.space_after = Pt(0)
code_style.paragraph_format.line_spacing = 1.05

doc.core_properties.title = "Báo cáo giữa kỳ Quản lý giảng viên QLHocPhan"
doc.core_properties.author = "Trần Văn Phước"
doc.core_properties.subject = "Lập trình đa nền tảng"


def paragraph(text, style=None, center=False):
    p = doc.add_paragraph(style=style)
    p.add_run(text)
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return p


def code_block(text):
    table = doc.add_table(rows=1, cols=1)
    table.autofit = False
    table.columns[0].width = Inches(6.48)
    cell = table.cell(0, 0)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F3F4F6")
    tcpr.append(shd)
    trpr = table.rows[0]._tr.get_or_add_trPr()
    trpr.append(OxmlElement("w:cantSplit"))
    p = cell.paragraphs[0]
    p.style = code_style
    p.add_run(text.rstrip())
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


figure_number = 0


def figure(relative_path, description):
    global figure_number
    path = SOURCE.parent / relative_path
    if not path.exists():
        raise FileNotFoundError(path)
    width_px, height_px = PILImage.open(path).size
    width_inches = min(6.48, 6.45 * width_px / height_px)
    if width_px >= height_px:
        width_inches = 6.35
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(path), width=Inches(width_inches))
    figure_number += 1
    paragraph(f"Hình {figure_number}. {description}.", "Figure Caption")


title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.add_run("BÁO CÁO GIỮA KỲ\nQUẢN LÝ GIẢNG VIÊN QL HỌC PHẦN")
paragraph("Môn học: Lập trình đa nền tảng", center=True)
doc.add_paragraph()
for label, value in (
    ("Sinh viên", "Trần Văn Phước"),
    ("MSSV", "23IT217"),
    ("Công nghệ", "React Native, Expo, Express, MongoDB"),
    ("Mã nguồn", "https://github.com/Phuocws0/ltdnt-gk-qlhocphan"),
):
    p = doc.add_paragraph()
    p.add_run(label + ": ").bold = True
    p.add_run(value)
doc.add_paragraph()
paragraph(
    "Báo cáo trình bày từng bước xây dựng ứng dụng, mã nguồn chính, "
    "ảnh cơ sở dữ liệu và kết quả chạy trên web, Android. "
    "Mã nguồn dùng chung cho iOS và đã xuất bundle iOS thành công."
)
doc.add_page_break()

in_code = False
code_lines = []
body_lines = []
in_results = False
result_item_count = 0


def flush_body():
    if body_lines:
        text = " ".join(body_lines).strip()
        if text:
            p = paragraph(text)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        body_lines.clear()


for raw in BODY:
    line = raw.rstrip()
    if line.startswith("```"):
        flush_body()
        if in_code:
            code_block("\n".join(code_lines))
            code_lines = []
            in_code = False
        else:
            in_code = True
        continue
    if in_code:
        code_lines.append(line)
        continue
    if line == "<!-- pagebreak -->":
        flush_body()
        doc.add_page_break()
        continue
    if line.startswith("## "):
        flush_body()
        heading = line[3:]
        if heading.startswith("Kết quả trên"):
            if in_results:
                doc.add_page_break()
            in_results = True
            result_item_count = 0
        elif heading.startswith("Tệp và liên kết"):
            doc.add_page_break()
        doc.add_heading(heading, level=1)
        continue
    if line.startswith("### "):
        flush_body()
        if in_results and result_item_count:
            doc.add_page_break()
        result_item_count += 1
        doc.add_heading(line[4:], level=2)
        continue
    match = re.match(r"!\[(.*?)\]\((.*?)\)", line)
    if match:
        flush_body()
        figure(match.group(2), match.group(1))
        continue
    if line.startswith("- "):
        flush_body()
        paragraph(line[2:], "List Bullet")
        continue
    if not line.strip():
        flush_body()
        continue
    body_lines.append(line)

flush_body()
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUTPUT)
print(f"{OUTPUT} ({figure_number} figures)")
