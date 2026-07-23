from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

OUT = Path(__file__).with_name('glocalizer-progress-and-roadmap-2026-07-23.pdf')
FONT = Path(r'C:\Windows\Fonts\malgun.ttf')
pdfmetrics.registerFont(TTFont('Malgun', str(FONT)))

INK = colors.HexColor('#172033')
MUTED = colors.HexColor('#667085')
GREEN = colors.HexColor('#16834B')
LIGHT_GREEN = colors.HexColor('#EAF7EF')
BLUE = colors.HexColor('#1667A8')
LIGHT_BLUE = colors.HexColor('#EAF2F8')
AMBER = colors.HexColor('#A86400')
LIGHT_AMBER = colors.HexColor('#FFF5DE')

base = getSampleStyleSheet()
styles = {
    'title': ParagraphStyle('title', parent=base['Title'], fontName='Malgun', fontSize=23, leading=31, textColor=INK, alignment=1, spaceAfter=9),
    'subtitle': ParagraphStyle('subtitle', parent=base['Normal'], fontName='Malgun', fontSize=11, leading=17, textColor=MUTED, alignment=1, spaceAfter=24),
    'h1': ParagraphStyle('h1', parent=base['Heading1'], fontName='Malgun', fontSize=16, leading=22, textColor=BLUE, spaceBefore=15, spaceAfter=8),
    'h2': ParagraphStyle('h2', parent=base['Heading2'], fontName='Malgun', fontSize=11.5, leading=17, textColor=INK, spaceBefore=9, spaceAfter=4),
    'body': ParagraphStyle('body', parent=base['BodyText'], fontName='Malgun', fontSize=9.5, leading=15, textColor=INK, spaceAfter=6),
    'small': ParagraphStyle('small', parent=base['Normal'], fontName='Malgun', fontSize=8.3, leading=12, textColor=MUTED),
    'table': ParagraphStyle('table', parent=base['Normal'], fontName='Malgun', fontSize=8.4, leading=12.2, textColor=INK),
    'head': ParagraphStyle('head', parent=base['Normal'], fontName='Malgun', fontSize=8.4, leading=12, textColor=BLUE, alignment=1),
}

def p(text, style='body'):
    return Paragraph(text, styles[style])

def grid(headers, rows, widths):
    data = [[p(header, 'head') for header in headers]] + [[p(cell, 'table') for cell in row] for row in rows]
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BLUE), ('GRID', (0, 0), (-1, -1), .35, colors.HexColor('#C5D2DE')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return table

def callout(title, text, background, color):
    box = Table([[p(f'<b><font color="#{color.hexval()[2:]}">{title}</font></b><br/>{text}', 'body')]], colWidths=[170 * mm])
    box.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), background), ('BOX', (0, 0), (-1, -1), .6, color), ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 9), ('BOTTOMPADDING', (0, 0), (-1, -1), 9)]))
    return box

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Malgun', 8); canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 12 * mm, 'Glocalizer | 개발 진행 및 다음 단계 보고서')
    canvas.drawRightString(190 * mm, 12 * mm, str(doc.page)); canvas.restoreState()

story = [Spacer(1, 26 * mm), p('Glocalizer 개발 진행 및 다음 단계 보고서', 'title'), p('OCR 정확도 고도화 · 원문 제거/번역 합성 MVP · 배포 준비 현황', 'subtitle')]
story += [grid(['항목', '현황'], [('작성일', str(date.today())), ('기준 브랜치', 'UnderDeploy · commit 4b49c97'), ('개발 서버', 'Frontend 127.0.0.1:5173 / Backend localhost:3000'), ('검증', 'Backend test 70건 및 frontend/backend production build 통과')], [38 * mm, 132 * mm]), Spacer(1, 10 * mm)]
story += [callout('핵심 결론', 'OCR의 단일 인식 의존을 제거하고, 다중 전처리 합의 → 선택적 Vision 재판정 → 사용자 검토로 이어지는 안전한 흐름을 구현했다. 현재 가장 중요한 잔여 작업은 Supabase migration 적용과 실제 사용자 이모티콘 30장 benchmark다.', LIGHT_GREEN, GREEN)]

story += [p('1. 지금까지 완료한 구현', 'h1')]
story += [grid(['영역', '완료 내용', '의미'], [
    ('OCR', 'PaddleOCR 한국어 PP-OCRv5 모델을 명시하고 원본·보정·threshold·투명 PNG 흰 배경 합성 변형을 인식한다.', '한 번의 오인식이 결과 전체를 결정하지 않게 함.'),
    ('합의 판정', 'IoU·문구 유사도·confidence·한글/문장부호 유효성으로 대표 문구와 agreement score를 선정한다.', '아자 + 스 같은 분절 및 물음표 누락을 줄일 기반 확보.'),
    ('불확실성 처리', '자동 승인 기준 미달 시 Gemini Vision fallback을 사용하며, 키가 없거나 낮은 confidence면 실패 대신 수동 OCR 검토 상태로 전환한다.', '잘못된 원문 삭제를 막음.'),
    ('편집/재처리', 'Editor에 인식 문구 수정 UI와 PATCH OCR API를 추가했다. 수정한 asset만 번역·cleanup을 다시 실행한다.', '다른 이미지 결과를 훼손하지 않는 수정 흐름.'),
    ('합성/cleanup', '대표 bbox를 원문/번역 위치 기준으로 유지하고, 불확실한 OCR은 자동 cleanup을 건너뛴다.', '오삭제 대신 사용자가 제어 가능한 보정 제공.'),
    ('운영 안전성', '민감 헤더 redact, `.env.example` 분리, 실제 `.env` 미커밋, 결과 API 메타데이터 확장.', '키 유출 및 디버그 로그 노출 방지.'),
], [27 * mm, 92 * mm, 51 * mm])]

story += [p('2. 검증 결과와 현재 제약', 'h1')]
story += [grid(['검증 항목', '결과', '비고'], [
    ('Backend unit/integration', '70 tests passed', 'OCR 합의, punctuation merge, OCR 수정 API의 인증·bbox 검증 포함.'),
    ('TypeScript build', '성공', 'backend production build 통과.'),
    ('Frontend build', '성공', 'Vite production build 통과.'),
    ('개발 서버', '실행 중', 'health endpoint 및 frontend HTTP 200 확인.'),
    ('실제 Supabase migration', '보류', 'WSL이 direct IPv6 DB endpoint에 도달하지 못해 ENETUNREACH 발생.'),
    ('실제 이미지 benchmark', '미수행', '사용자 제공 30장 표본과 정답 문구가 아직 manifest에 등록되지 않음.'),
], [45 * mm, 35 * mm, 90 * mm]), Spacer(1, 6 * mm), callout('배포 전 차단 항목', 'Supabase Dashboard의 Connect → Session pooler connection string을 backend/.env의 DATABASE_URL로 설정한 뒤 `npm run db:migrate`를 실행해야 OCR metadata column이 DB에 영구 저장된다. 코드에는 migration 전 호환 fallback도 포함되어 있다.', LIGHT_AMBER, AMBER)]

story += [PageBreak(), p('3. 다음 해야 할 일: 우선순위 실행 계획', 'h1')]
story += [grid(['순서', '작업', '완료 기준', '우선순위'], [
    ('P0', 'Session Pooler DATABASE_URL 설정 후 migration 009/010 적용', 'db:migrate 성공 및 ocr_regions metadata column 확인', '즉시'),
    ('P0', '실제 PNG/JPG 한 장으로 upload → OCR → 수정 → cleanup → PNG export smoke test', '다운로드 PNG가 Editor preview와 동일', '즉시'),
    ('P1', '30장 이모티콘 benchmark manifest 작성 및 정답 문구 검수', '완전 일치율·CER·중앙 처리시간·Vision fallback 비율 산출', '다음'),
    ('P1', 'OCR 오답 유형별 튜닝', '분절/문장부호/작은 글씨/복잡 배경별 threshold 조정 근거 확보', 'benchmark 후'),
    ('P1', 'Vision fallback 비용·timeout 제한 설정', 'fallback 25% 이하 및 timeout 시 수동 검토 UX 확인', 'benchmark 후'),
    ('P2', '다중 이미지 병렬 처리·asset별 결과 UX', '부분 실패가 전체 작업을 막지 않고 ZIP export 가능', 'MVP 안정화 후'),
    ('P2', 'worker 분리, stale job 회수, observability', '재시작·장시간 작업·배포 환경에서 복구 가능', '확장 단계'),
], [12 * mm, 69 * mm, 66 * mm, 23 * mm])]

story += [p('4. 권장 운영 기준', 'h1'), p('<b>정확도:</b> 문구 완전 일치율 90% 이상, CER 5% 이하를 목표로 한다. <b>속도:</b> Paddle OCR 중앙값 5초 이하, Vision fallback 비율 25% 이하를 유지한다. <b>안전:</b> 낮은 신뢰도에서는 자동 원문 제거를 하지 않고 수동 수정 또는 cleanup 도구로 넘긴다.'), p('5. 배포/환경변수 체크리스트', 'h1')]
for text in ['backend/.env에 Session Pooler DATABASE_URL 설정 (Git 미커밋).', 'Supabase API keys, GROQ_API_KEY, 선택적 GEMINI_API_KEY를 backend server environment에만 설정.', 'Storage bucket CORS에 frontend origin을 허용.', 'migration 실행 후 `npm run db:check`, `npm run test`, `npm run build` 수행.', 'Render 등 배포 환경에서 frontend origin 및 CORS preflight 확인.']:
    story.append(p('• ' + text))
story += [Spacer(1, 6 * mm), callout('다음 개발 세션의 첫 작업', '사용자가 Session Pooler URL을 설정하면 migration을 적용하고, 제공받은 실제 이모티콘으로 benchmark를 시작한다. 이 결과를 기준으로 OCR score threshold와 preprocessing을 수치로 조정한다.', LIGHT_BLUE, BLUE)]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
