import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/common/Button';
import { UploadedFileList } from '@/components/dashboard/UploadedFileList';
import { UploadZone } from '@/components/dashboard/UploadZone';
import { OptionSelector } from '@/components/dashboard/OptionSelector';
import {
  LoadingSteps,
  type LoadingStep,
} from '@/components/common/LoadingSteps';
import { useProjectState } from '@/hooks/useProjectState';
import { useToast } from '@/hooks/useToast';
import { buildProjectImage, pickMockSourcePhrase } from '@/lib/mockTranslate';
import type {
  TargetLanguage,
  TranslationStyle,
  UploadedFile,
} from '@/types/project';

const LANGUAGE_OPTIONS: {
  value: TargetLanguage;
  label: string;
  flag: string;
}[] = [
  { value: 'en', label: 'English', flag: '/flags/us.png' },
  { value: 'ja', label: '日本語', flag: '/flags/jp.png' },
  { value: 'zh', label: '中文', flag: '/flags/cn.png' },
  { value: 'ko', label: '한국어', flag: '/flags/kr.png' },
  { value: 'es', label: 'Español', flag: '/flags/es.png' },
  { value: 'fr', label: 'Français', flag: '/flags/fr.png' },
  { value: 'de', label: 'Deutsch', flag: '/flags/de.png' },
];

const DEFAULT_TRANSLATION_STYLE: TranslationStyle = 'natural';

const PROCESS_STEPS: LoadingStep[] = [
  { id: 'detect', label: '이모티콘 문구 감지 중' },
  { id: 'translate', label: '현지화 표현 생성 중' },
  { id: 'prepare', label: '편집 화면 준비 중' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { setProject } = useProjectState();
  const { showToast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('en');
  const [processing, setProcessing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    },
    [],
  );

  const handleFiles = (newFiles: File[]) => {
    const uploadedFiles = newFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      name: file.name,
      size: file.size,
      sourceText: pickMockSourcePhrase(files.length + index),
      previewUrl: URL.createObjectURL(file),
      status: 'success' as const,
    }));
    setFiles((previousFiles) => [...previousFiles, ...uploadedFiles]);
    showToast({
      title:
        uploadedFiles.length > 1
          ? `${uploadedFiles.length}장을 추가했어요`
          : '이모티콘을 추가했어요',
      variant: 'success',
    });
  };

  const removeFile = (id: string) => {
    const removed = files.find((file) => file.id === id);
    setFiles((currentFiles) => currentFiles.filter((file) => file.id !== id));
    if (removed) showToast({ title: '이모티콘을 제거했어요' });
  };

  const finishStart = () => {
    setProject({
      id: `project-${Date.now()}`,
      name: '새 이모티콘 프로젝트',
      targetLanguage,
      translationStyle: DEFAULT_TRANSLATION_STYLE,
      images: files.map((file) =>
        buildProjectImage(
          file.id,
          file.name,
          file.sourceText,
          targetLanguage,
          DEFAULT_TRANSLATION_STYLE,
          file.previewUrl,
        ),
      ),
    });
    navigate('/editor');
  };

  const handleStart = () => {
    if (files.length === 0 || processing) return;
    setProcessing(true);
    setStepIndex(0);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i += 1;
      if (i >= PROCESS_STEPS.length) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        finishStart();
      } else {
        setStepIndex(i);
      }
    }, 750);
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader section="새 프로젝트" />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
        <section>
          <h1 className="text-[32px] font-extrabold leading-tight text-text-primary sm:text-[38px]">
            이모티콘을 올려주세요
          </h1>
          <p className="mt-2 text-[15px] font-medium text-text-muted sm:text-[17px]">
            PNG, JPG, GIF 파일을 여러 장 한꺼번에 올릴 수 있어요
          </p>
          <div className="mt-5">
            <UploadZone onFiles={handleFiles} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-[20px] font-bold text-text-primary">
            이모티콘 컬렉션
          </h2>
          {files.length > 0 ? (
            <div className="mt-4">
              <UploadedFileList files={files} onRemove={removeFile} />
            </div>
          ) : (
            <div className="mt-3 flex min-h-[96px] items-center justify-center rounded-[24px] bg-surface px-6 text-center text-sm font-medium text-text-muted">
              업로드한 이모티콘이 여기에 모여요
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              document.getElementById('emoticon-upload-zone')?.click()
            }
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand"
          >
            <Plus className="size-4" /> 이미지 더 추가하기
          </button>
        </section>

        <section className="mt-8">
          <OptionSelector
            label="어느 나라 말로 바꿀까요?"
            layout="row"
            options={LANGUAGE_OPTIONS}
            value={targetLanguage}
            onChange={setTargetLanguage}
          />
        </section>

        <Button
          size="lg"
          className="mt-8 w-full rounded-2xl"
          disabled={files.length === 0 || processing}
          onClick={handleStart}
        >
          {files.length > 0
            ? `${files.length}장 번역하기`
            : '이모티콘을 먼저 올려주세요'}
          {files.length > 0 ? <ArrowRight className="size-5" /> : null}
        </Button>
      </main>

      {processing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[0_20px_60px_-30px_rgba(25,31,40,0.4)]">
            <h2 className="text-center text-lg font-bold text-text-primary">
              이모티콘을 준비하는 중이에요
            </h2>
            <p className="mt-1 text-center text-sm text-text-secondary">
              잠시만 기다려 주세요
            </p>
            <div className="mt-6">
              <LoadingSteps steps={PROCESS_STEPS} currentIndex={stepIndex} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
