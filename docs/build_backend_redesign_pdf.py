from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).parent
OUT = ROOT / 'glocalizer-backend-redesign-report.pdf'
FONT = Path(r'C:\Windows\Fonts\malgun.ttf')

pdfmetrics.registerFont(TTFont('Malgun', str(FONT)))

INK = colors.HexColor('#172033')
MUTED = colors.HexColor('#667085')
BLUE = colors.HexColor('#2E74B5')
DARK_BLUE = colors.HexColor('#1F4D78')
PALE_BLUE = colors.HexColor('#E8EEF5')
PALE_GRAY = colors.HexColor('#F4F6F9')
RISK_RED = colors.HexColor('#9B1C1C')
GREEN = colors.HexColor('#157347')


def styles():
    base = getSampleStyleSheet()
    return {
        'kicker': ParagraphStyle('Kicker', parent=base['Normal'], fontName='Malgun', fontSize=9.5, leading=13, textColor=BLUE, alignment=TA_CENTER, spaceAfter=6),
        'title': ParagraphStyle('TitleKr', parent=base['Title'], fontName='Malgun', fontSize=23, leading=31, textColor=INK, alignment=TA_CENTER, spaceAfter=6),
        'subtitle': ParagraphStyle('SubtitleKr', parent=base['Normal'], fontName='Malgun', fontSize=12, leading=18, textColor=MUTED, alignment=TA_CENTER, spaceAfter=20),
        'body': ParagraphStyle('BodyKr', parent=base['BodyText'], fontName='Malgun', fontSize=9.8, leading=16, textColor=INK, spaceAfter=7),
        'h1': ParagraphStyle('H1Kr', parent=base['Heading1'], fontName='Malgun', fontSize=15, leading=21, textColor=BLUE, spaceBefore=14, spaceAfter=7),
        'small': ParagraphStyle('SmallKr', parent=base['Normal'], fontName='Malgun', fontSize=8.5, leading=12.5, textColor=MUTED),
        'table': ParagraphStyle('TableKr', parent=base['Normal'], fontName='Malgun', fontSize=8.4, leading=12, textColor=INK),
        'tablehead': ParagraphStyle('TableHeadKr', parent=base['Normal'], fontName='Malgun', fontSize=8.4, leading=11.5, textColor=DARK_BLUE, alignment=TA_CENTER),
        'callout': ParagraphStyle('CalloutKr', parent=base['Normal'], fontName='Malgun', fontSize=9.2, leading=14, textColor=INK),
    }


S = styles()


def p(text, style='body'):
    return Paragraph(text, S[style])


def table(headers, rows, widths):
    data = [[p(value, 'tablehead') for value in headers]]
    data.extend([[p(value, 'table') for value in row] for row in rows])
    result = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PALE_BLUE),
        ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#C8D2E0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return result


def callout(label, text, color=BLUE):
    paragraph = Paragraph(f'<font color="#{color.hexval()[2:]}" name="Malgun"><b>{label}</b></font>  {text}', S['callout'])
    result = Table([[paragraph]], colWidths=[6.5 * inch], hAlign='LEFT')
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PALE_BLUE if color == BLUE else PALE_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.55, color),
        ('LEFTPADDING', (0, 0), (-1, -1), 11),
        ('RIGHTPADDING', (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
    ]))
    return result


def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet>{text}', ParagraphStyle('BulletKr', parent=S['body'], leftIndent=16, firstLineIndent=-10, bulletIndent=0, spaceAfter=4))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Malgun', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.75 * inch, 0.42 * inch, 'Glocalizer | Backend Redesign Report')
    canvas.drawRightString(7.75 * inch, 0.42 * inch, f'{doc.page}')
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(str(OUT), pagesize=letter, rightMargin=0.75 * inch, leftMargin=0.75 * inch, topMargin=0.8 * inch, bottomMargin=0.72 * inch)
    story = []
    story += [Spacer(1, 0.25 * inch), p('TECHNICAL DECISION REPORT', 'kicker'), p('Glocalizer 백엔드 재구성 보고서', 'title'), p('무료 우선 OCR·번역 파이프라인과 안정적인 PNG 편집 흐름', 'subtitle')]
    story += [table(['구분', '내용'], [
        ('대상', 'Glocalizer 이미지 현지화 backend'),
        ('작성일', '2026-07-23'),
        ('의사결정', 'Gemini Vision 단일 의존 구조를 분리형 OCR + translation provider 구조로 전환'),
        ('우선 범위', '이미지 1장 MVP 안정화 후 다중 asset과 ZIP으로 확장'),
    ], [1.45 * inch, 5.05 * inch]), Spacer(1, 0.16 * inch)]
    story += [callout('권고안', 'OCR 좌표는 local PaddleOCR bridge가 담당하고, 번역은 text-only provider를 교체 가능하게 분리한다. 자동 cleanup과 Canvas export는 기존 역할을 유지한다.'), Spacer(1, 0.18 * inch)]

    story += [p('1. 현황과 문제 정의', 'h1'), p('현재 backend는 Gemini Vision 한 번의 요청에 이미지 OCR, 대표 영역 선택, 번역 후보, 좌표 JSON 생성을 모두 맡긴다. 이 구조는 간결하지만 provider의 모델 폐기, quota, 응답 형식 변화가 전체 작업 실패로 바로 이어진다.')]
    story += [table(['관찰된 문제', '영향', '구조적 원인'], [
        ('모델 폐기', '프로젝트가 즉시 failed 상태로 전환', 'GEMINI_MODEL이 pipeline과 failure code에 강하게 결합'),
        ('오류 정보 손실', 'Editor에는 동일한 일반 실패 문구만 표시', 'SDK의 HTTP status·provider message를 AppError가 덮어씀'),
        ('좌표 품질 변동', 'cleanup·editor·PNG 합성 위치가 흔들림', 'vision LLM이 OCR과 polygon을 동시에 추론'),
        ('확장 어려움', '다중 asset과 재시도 정책이 복잡해짐', '한 service가 download부터 DB 저장까지 수행'),
    ], [1.55 * inch, 2.1 * inch, 2.85 * inch]), Spacer(1, 0.08 * inch)]

    story += [p('2. 목표 아키텍처', 'h1'), p('새 구조는 역할을 세 계층으로 고정한다. API는 job 생성과 결과 조회만 담당하고, worker는 asset 상태 전이만 orchestration하며, provider는 OCR 또는 번역 하나만 책임진다.')]
    story += [table(['단계', '책임', '입력 / 출력'], [
        ('API', 'signed upload, project token 인증, job enqueue, 상태 조회', 'project·asset request / job id·status'),
        ('Worker', 'asset별 순서·재시도·실패 기록·project aggregate', 'queued asset / completed 또는 failed asset'),
        ('OCR engine', '한글 text, polygon, confidence 추출', 'preprocessed image / normalized region[]'),
        ('Translation provider', '원문과 context 기반 후보·추천 스타일 생성', 'source text / candidates[]'),
        ('Cleanup', 'transparent 또는 solid cleanup 결과 생성', 'image + primary region / cleaned image 또는 manual fallback'),
    ], [1.05 * inch, 2.7 * inch, 2.75 * inch]), Spacer(1, 0.14 * inch), callout('프로세스 경계', 'PaddleOCR는 별도 HTTP 서버가 아니라 backend worker가 관리하는 persistent Python child process로 실행한다. 개발 환경에서도 frontend와 backend 두 서버만 열면 된다.', GREEN), Spacer(1, 0.16 * inch)]

    story += [p('3. 처리 흐름과 상태 전이', 'h1'), p('상태는 project가 아니라 asset을 진실의 원천으로 삼는다. project progress는 asset 상태를 집계해 만든다. 각 단계의 provider·model·latency·원본 오류는 processing run으로 남긴다.')]
    story += [table(['순서', 'asset 상태', '실패 시 처리'], [
        ('1', 'uploaded → preprocessing', '파일 형식·크기·이미지 decode 오류를 terminal failed로 기록'),
        ('2', 'recognizing', 'OCR bridge timeout은 retryable failed; text 없음은 OCR_TEXT_NOT_FOUND'),
        ('3', 'translating', 'provider 401/429/5xx/JSON 오류를 분리해 기록하고 retry policy 적용'),
        ('4', 'cleaning', '복잡한 배경은 failed가 아니라 needsManualCleanup=true로 completed'),
        ('5', 'completed', 'editor가 original 또는 cleaned base 위에 동일한 normalized state를 복원'),
    ], [0.5 * inch, 2.0 * inch, 4.0 * inch]), Spacer(1, 0.12 * inch)]

    story += [p('4. Provider 전략', 'h1'), table(['역할', 'Primary', 'Fallback / 정책'], [
        ('OCR + bbox', 'PaddleOCR local bridge', '다른 cloud vision으로 자동 전송하지 않음'),
        ('번역 후보', 'Groq text provider', 'rate limit은 retryable; 자동 OpenRouter fallback 금지'),
        ('오프라인 번역', '선택형 local NLLB provider', 'GPU/속도 벤치마크 통과 시 활성화'),
        ('자동 cleanup', 'Sharp 기반 existing implementation', 'low quality는 manual cleanup으로 완료'),
    ], [1.25 * inch, 2.05 * inch, 3.2 * inch]), Spacer(1, 0.08 * inch), p('OpenRouter 무료 router는 모델과 데이터 경로가 요청마다 달라질 수 있어 기본 자동 fallback으로 사용하지 않는다. 필요하면 관리자가 명시적으로 켜는 development-only provider로 둔다.', 'small')]

    story.append(PageBreak())
    story += [p('5. 코드·데이터 구조', 'h1'), table(['영역', '신규 책임', '핵심 파일 예시'], [
        ('pipeline', '단계 orchestration과 asset 상태 전이', 'pipeline/asset-pipeline.ts'),
        ('ocr', 'provider interface, Python bridge, normalized polygon', 'ocr/paddle/paddle-bridge.ts'),
        ('translation', 'Groq·local provider, 후보 검증, model metadata', 'translation/translation-provider.ts'),
        ('observability', 'provider/model/latency/error classification 기록', 'observability/processing-run.repository.ts'),
        ('worker', 'job claim, stale recovery, retryable failure 재큐잉', 'worker/job-runner.ts'),
    ], [1.25 * inch, 2.65 * inch, 2.6 * inch]), Spacer(1, 0.12 * inch), p('DB는 기존 projects, assets, ocr_regions, translations, jobs, editor_states를 유지한다. numbered migration으로 processing_runs 테이블과 assets의 provider failure metadata만 추가한다. Gemini, GLM 등 provider 이름을 컬럼명·error code에 넣지 않는다.')]
    story += [p('6. 구현 로드맵', 'h1'), table(['단계', '작업', '통과 기준'], [
        ('A. 분리', 'Gemini 전용 pipeline 제거, provider-neutral type·error code 도입', '기존 API contract와 unit test 유지'),
        ('B. OCR', 'persistent PaddleOCR bridge·polygon normalization 구현', '실제 이미지 bbox가 Canvas와 일치'),
        ('C. 번역', 'Groq text provider·JSON validator·provider health check 구현', '401/404/429/timeout이 사용자 메시지와 DB에 구분됨'),
        ('D. 관측', 'processing run·asset retry·stale job recovery 추가', '재시도 후에도 원인과 attempt 확인 가능'),
        ('E. 벤치마크', '실제 이모티콘 30장으로 OCR·번역·latency 측정', '품질·속도 기준 충족 후 multi-file 진행'),
    ], [0.55 * inch, 3.05 * inch, 2.9 * inch]), Spacer(1, 0.12 * inch)]
    story += [p('7. 수용 기준과 리스크', 'h1')]
    story += [bullet('이미지 1장 처리에서 한글 원문·bbox·번역 후보가 저장되고 editor 새로고침 후 동일하게 복원된다.'), bullet('PaddleOCR 실패, Groq rate limit, translation JSON 오류가 서로 다른 error code와 재시도 가능 여부로 기록된다.'), bullet('복잡한 배경은 작업 자체를 실패시키지 않고 manualCleanup 상태로 editor에 전달된다.'), bullet('다운로드 PNG는 editor Canvas와 같은 normalized rect, text 위치, 색상, 크기, 회전을 반영한다.'), bullet('provider API key는 backend env에만 존재하며 frontend bundle·로그·error response에는 노출되지 않는다.'), Spacer(1, 0.08 * inch), callout('리스크 관리', 'PaddleOCR의 한국어 품질과 CPU/GPU latency는 먼저 30장 벤치마크로 측정한다. 기준 미달이면 OCR provider만 교체할 수 있도록 interface와 storage schema를 고정한다.', RISK_RED), Spacer(1, 0.15 * inch)]
    story += [p('8. 참고 자료', 'h1'), p('Google Gemini 모델 문서: https://ai.google.dev/gemini-api/docs/models', 'small'), p('Groq Llama 4 Scout 문서: https://console.groq.com/docs/model/meta-llama/llama-4-scout-17b-16e-instruct', 'small'), p('OpenRouter Free Router: https://openrouter.ai/openrouter/free', 'small')]
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUT)


if __name__ == '__main__':
    build()
