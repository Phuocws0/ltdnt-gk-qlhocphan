"""Build the step-by-step submission report from docs/BAO_CAO.md."""

import os
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN = ROOT / "docs" / "BAO_CAO.md"
OUTPUT = ROOT / "output" / "pdf" / "Bao-cao-QLHocPhan.pdf"
BLUE = colors.HexColor("#174476")
MUTED = colors.HexColor("#526276")
RULE = colors.HexColor("#d3dce8")


def font_path(filename):
    candidates = [
        Path(os.environ.get("REPORT_FONT_DIR", "/tmp/tnr-fonts")) / filename,
        Path("/usr/share/fonts/truetype/msttcorefonts") / filename.lower(),
        Path("/usr/share/fonts/truetype/msttcorefonts") / filename,
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError(
        f"Thiếu {filename}. Cài Times New Roman hoặc đặt REPORT_FONT_DIR."
    )


pdfmetrics.registerFont(TTFont("TimesNewRoman", font_path("Times.TTF")))
pdfmetrics.registerFont(TTFont("TimesNewRoman-Bold", font_path("Timesbd.TTF")))
pdfmetrics.registerFont(
    TTFont("LiberationMono", "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf")
)
pdfmetrics.registerFontFamily(
    "TimesNewRoman",
    normal="TimesNewRoman",
    bold="TimesNewRoman-Bold",
)

styles = {
    "title": ParagraphStyle(
        "ReportTitle",
        fontName="TimesNewRoman-Bold",
        fontSize=22,
        leading=29,
        alignment=TA_CENTER,
        textColor=BLUE,
        spaceAfter=18,
    ),
    "subtitle": ParagraphStyle(
        "ReportSubtitle",
        fontName="TimesNewRoman",
        fontSize=14,
        leading=20,
        alignment=TA_CENTER,
        spaceAfter=28,
    ),
    "body": ParagraphStyle(
        "ReportBody",
        fontName="TimesNewRoman",
        fontSize=11.5,
        leading=17,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
    ),
    "bullet": ParagraphStyle(
        "ReportBullet",
        fontName="TimesNewRoman",
        fontSize=11.5,
        leading=17,
        alignment=TA_LEFT,
        leftIndent=10,
        firstLineIndent=-10,
        spaceAfter=8,
    ),
    "meta": ParagraphStyle(
        "ReportMeta",
        fontName="TimesNewRoman",
        fontSize=12,
        leading=20,
        alignment=TA_LEFT,
    ),
    "step": ParagraphStyle(
        "ReportStep",
        fontName="TimesNewRoman-Bold",
        fontSize=15,
        leading=21,
        textColor=BLUE,
        spaceBefore=15,
        spaceAfter=9,
        keepWithNext=True,
    ),
    "result": ParagraphStyle(
        "ReportResult",
        fontName="TimesNewRoman-Bold",
        fontSize=13,
        leading=18,
        textColor=BLUE,
        spaceBefore=5,
        spaceAfter=9,
        keepWithNext=True,
    ),
    "caption": ParagraphStyle(
        "ReportCaption",
        fontName="TimesNewRoman",
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=MUTED,
        spaceBefore=6,
        spaceAfter=12,
    ),
    "code": ParagraphStyle(
        "ReportCode",
        fontName="LiberationMono",
        fontSize=8,
        leading=11,
        textColor=colors.white,
    ),
}


def text_paragraph(value, style="body"):
    safe = escape(value)

    def linked(match):
        url = match.group(1)
        label = (
            "Xem video web" if url.endswith(".webm")
            else "Xem video Android" if url.endswith(".mp4")
            else "Mở mã nguồn"
        )
        return f'<link href="{url}"><font color="#174476"><u>{label}</u></font></link>'

    safe = re.sub(
        r"(https?://[^\s]+)",
        linked,
        safe,
    )
    return Paragraph(safe, styles[style])


def code_panel(code):
    block = Preformatted(code.rstrip(), styles["code"])
    panel = Table([[block]], colWidths=[480])
    panel.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1e293b")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
            ]
        )
    )
    return panel


def picture(relative_path, caption):
    path = MARKDOWN.parent / relative_path
    if not path.exists():
        raise FileNotFoundError(path)
    img = Image(str(path))
    factor = min(480 / img.imageWidth, 545 / img.imageHeight)
    img.drawWidth = img.imageWidth * factor
    img.drawHeight = img.imageHeight * factor
    img.hAlign = "CENTER"
    return [img, text_paragraph(caption, "caption")]


lines = MARKDOWN.read_text(encoding="utf-8").splitlines()
cover_end = lines.index("<!-- pagebreak -->")
body_lines = lines[cover_end + 1 :]

story = [
    Spacer(1, 44),
    Paragraph("BÁO CÁO GIỮA KỲ", styles["title"]),
    Paragraph("LẬP TRÌNH ĐA NỀN TẢNG", styles["subtitle"]),
    Spacer(1, 18),
]
cover_meta = [
    ("Đề tài", "Ứng dụng quản lý giảng viên QLHocPhan"),
    ("Sinh viên", "Trần Văn Phước"),
    ("MSSV", "23IT217"),
    ("Công nghệ", "React Native, Expo, Express, MongoDB"),
]
for label, value in cover_meta:
    story.append(
        Paragraph(
            f'<b>{escape(label)}:</b> {escape(value)}',
            styles["meta"],
        )
    )
story.extend(
    [
        Spacer(1, 15),
        Paragraph(
            '<b>Mã nguồn:</b> <link href="https://github.com/Phuocws0/ltdnt-gk-qlhocphan">'
            '<font color="#174476"><u>github.com/Phuocws0/ltdnt-gk-qlhocphan</u></font></link>',
            styles["meta"],
        ),
        Paragraph(
            '<b>Video:</b> <link href="https://github.com/Phuocws0/ltdnt-gk-qlhocphan/blob/main/docs/videos/demo-web.webm">'
            '<font color="#174476"><u>Demo web</u></font></link> · '
            '<link href="https://github.com/Phuocws0/ltdnt-gk-qlhocphan/blob/main/docs/videos/demo-android.mp4">'
            '<font color="#174476"><u>Demo Android</u></font></link>',
            styles["meta"],
        ),
        Spacer(1, 28),
        text_paragraph(
            "Báo cáo trình bày các bước xây dựng ứng dụng, mã nguồn chính, "
            "ảnh cơ sở dữ liệu và kết quả chạy trên web, Android. "
            "Mã nguồn dùng chung cho iOS và đã xuất bundle iOS thành công."
        ),
        PageBreak(),
    ]
)

paragraph_lines = []
code_lines = []
in_code = False
in_results = False
result_item_count = 0


def flush_paragraph():
    if paragraph_lines:
        story.append(text_paragraph(" ".join(paragraph_lines).strip()))
        paragraph_lines.clear()


for raw in body_lines:
    line = raw.rstrip()
    if line.startswith("```"):
        flush_paragraph()
        if in_code:
            story.append(code_panel("\n".join(code_lines)))
            story.append(Spacer(1, 9))
            code_lines = []
            in_code = False
        else:
            in_code = True
        continue
    if in_code:
        code_lines.append(line)
        continue
    if line == "<!-- pagebreak -->":
        flush_paragraph()
        story.append(PageBreak())
        continue
    if line.startswith("## "):
        flush_paragraph()
        title = line[3:]
        if title.startswith("Kết quả trên"):
            if not in_results:
                in_results = True
            else:
                story.append(PageBreak())
            result_item_count = 0
        elif title.startswith("Tệp và liên kết"):
            story.append(PageBreak())
        story.append(text_paragraph(title, "step"))
        continue
    if line.startswith("### "):
        flush_paragraph()
        if in_results and result_item_count:
            story.append(PageBreak())
        result_item_count += 1
        story.append(text_paragraph(line[4:], "result"))
        continue
    match = re.match(r"!\[(.*?)\]\((.*?)\)", line)
    if match:
        flush_paragraph()
        story.extend(picture(match.group(2), match.group(1)))
        continue
    if line.startswith("- "):
        flush_paragraph()
        story.append(text_paragraph("• " + line[2:], "bullet"))
        continue
    if not line.strip():
        flush_paragraph()
        continue
    paragraph_lines.append(line)

flush_paragraph()
OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def footer(canvas, doc):
    canvas.setTitle("Báo cáo giữa kỳ Quản lý giảng viên QLHocPhan")
    canvas.setAuthor("Trần Văn Phước")
    canvas.setFont("TimesNewRoman", 9)
    canvas.setFillColor(MUTED)
    canvas.drawString(55, 28, "Trần Văn Phước  |  23IT217")
    canvas.drawRightString(A4[0] - 55, 28, str(doc.page))
    canvas.setStrokeColor(RULE)
    canvas.line(55, 42, A4[0] - 55, 42)


SimpleDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    rightMargin=55,
    leftMargin=55,
    topMargin=50,
    bottomMargin=58,
).build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
