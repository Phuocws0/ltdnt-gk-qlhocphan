from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Image,PageBreak,Preformatted,Table,TableStyle
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from xml.sax.saxutils import escape
from pathlib import Path
pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
styles=getSampleStyleSheet()
for name in ['Normal','Title','Heading1','Heading2']:styles[name].fontName='DejaVuBold' if name!='Normal' else 'DejaVu'
styles['Normal'].fontSize=10;styles['Normal'].leading=15;styles['Normal'].spaceAfter=8
styles['Title'].fontSize=21;styles['Title'].leading=29;styles['Title'].textColor=HexColor('#145b48')
styles['Heading2'].fontSize=14;styles['Heading2'].leading=21;styles['Heading2'].spaceBefore=16;styles['Heading2'].textColor=HexColor('#145b48')
story=[]
table_rows=[]
for line in Path('docs/BAO_CAO.md').read_text().splitlines():
 if line.startswith('| ---'):continue
 if line.startswith('|'):
  table_rows.append([Paragraph(escape(c.strip()),styles['Normal']) for c in line.strip('|').split('|')]);continue
 if table_rows:
  table=Table(table_rows,colWidths=[180,65,250],repeatRows=1);table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor('#e5f0e9')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.5,HexColor('#bfcfc5')),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8)]));story.append(table);story.append(Spacer(1,14));table_rows=[]
 if not line.strip() or line.startswith('!['):continue
 if line.startswith('# '):story.append(Paragraph(escape(line[2:]),styles['Title']))
 elif line.startswith('## '):story.append(Paragraph(escape(line[3:]),styles['Heading2']))
 else:story.append(Paragraph(escape(line.replace('`','')),styles['Normal']))
for p in sorted(Path('docs/screenshots').glob('*.png')):
 story.append(PageBreak());story.append(Paragraph('Minh chứng: '+p.stem,styles['Heading2']));im=Image(str(p));factor=min(490/im.imageWidth,660/im.imageHeight);im.drawWidth=im.imageWidth*factor;im.drawHeight=im.imageHeight*factor;story.append(im)
def footer(c,d):
 c.setFont('DejaVu',8);c.setFillColor(HexColor('#66776c'));c.drawString(48,27,'QL Học Phần | React Native + Expo + MongoDB');c.drawRightString(547,27,str(d.page))
SimpleDocTemplate('output/pdf/Bao-cao-QLHocPhan.pdf',rightMargin=48,leftMargin=48,topMargin=42,bottomMargin=48).build(story,onFirstPage=footer,onLaterPages=footer)
