import { useState } from 'react';
import { Check, Type, Move, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Emoticon } from '@/components/common/Emoticon';

const CANDIDATES = [
  { label: '직역', text: '놀랍다' },
  { label: '자연스러운 표현', text: '대박!' },
  { label: '밈 스타일', text: '레전드!' },
];

function CulturalTranslation() {
  const [selected, setSelected] = useState(2);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div>
        <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-[13px] font-semibold text-brand">
          문화 맥락 번역
        </span>
        <h3 className="mt-4 text-balance text-[28px] font-bold leading-tight tracking-tight text-text-primary sm:text-[32px]">
          단어가 아닌 감정까지 번역합니다.
        </h3>
        <p className="mt-3 max-w-md text-[17px] leading-relaxed text-text-secondary">
          목표 사용자에 따라 직역, 자연스러운 표현, 밈 스타일 중에서 어울리는
          표현을 선택하세요.
        </p>
      </div>

      <div className="rounded-[28px] border border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-medium text-text-muted">원문</span>
          <span className="text-[22px] font-bold text-text-primary">대박</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {CANDIDATES.map((c, i) => {
            const active = i === selected;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={active}
                className={cn(
                  'flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors',
                  active
                    ? 'border-brand bg-brand-soft'
                    : 'border-border bg-background hover:bg-surface',
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border',
                      active
                        ? 'border-brand bg-brand text-white'
                        : 'border-border bg-background',
                    )}
                  >
                    {active ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'text-[17px]',
                      active
                        ? 'font-bold text-text-primary'
                        : 'font-medium text-text-primary',
                    )}
                  >
                    {c.text}
                  </span>
                </span>
                <span className="text-[13px] font-medium text-text-muted">
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DirectEditing() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div className="lg:order-2">
        <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-[13px] font-semibold text-brand">
          이미지에서 바로 편집
        </span>
        <h3 className="mt-4 text-balance text-[28px] font-bold leading-tight tracking-tight text-text-primary sm:text-[32px]">
          현지화한 문구를 이미지 위에서 바로 편집하세요.
        </h3>
        <p className="mt-3 max-w-md text-[17px] leading-relaxed text-text-secondary">
          원문을 지우고 번역문을 다듬은 뒤, 별도 디자인 도구 없이 결과물을
          내보낼 수 있습니다.
        </p>
      </div>

      <div className="lg:order-1">
        <div className="rounded-[28px] border border-border bg-background p-4">
          {/* toolbar */}
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary">
              <Type className="size-4" /> Pretendard
            </span>
            <span className="h-4 w-px bg-border" />
            <span className="text-[13px] font-medium text-text-secondary">
              34px
            </span>
            <span className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1 text-[12px] font-semibold text-white">
              <Download className="size-3.5" /> 내보내기
            </span>
          </div>
          {/* canvas */}
          <div className="checkerboard relative flex aspect-[4/3] items-center justify-center rounded-2xl">
            <div className="relative h-[70%] w-[52%]">
              <Emoticon phrase="열공" />
              <span
                className="absolute inset-x-0 bottom-0 text-center leading-none text-text-primary"
                style={{
                  fontFamily: "'Pretendard Variable', sans-serif",
                  fontSize: 26,
                }}
              >
                Locked IN!
              </span>
              {/* selection box */}
              <span className="pointer-events-none absolute -inset-1 bottom-[-6px] top-auto flex h-9 items-center justify-center rounded-md border-2 border-brand">
                <span className="absolute -left-1.5 -top-1.5 size-2.5 rounded-full border-2 border-brand bg-background" />
                <span className="absolute -right-1.5 -top-1.5 size-2.5 rounded-full border-2 border-brand bg-background" />
                <span className="absolute -bottom-1.5 -left-1.5 size-2.5 rounded-full border-2 border-brand bg-background" />
                <span className="absolute -bottom-1.5 -right-1.5 size-2.5 rounded-full border-2 border-brand bg-background" />
              </span>
            </div>
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1 text-[11px] font-medium text-text-secondary">
              <Move className="size-3" /> 드래그하여 이동
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureSection() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 sm:py-28">
      <div className="flex flex-col gap-20 sm:gap-28">
        <CulturalTranslation />
        <DirectEditing />
      </div>
    </section>
  );
}
