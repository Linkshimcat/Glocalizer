# 번역 fallback 운영 관측과 품질 평가

기준 main은 `bba8531`이다. 이 변경은 `codex/translation-fallback-quality-20261008`에서 진행하며, 별도 백엔드 안정성 브랜치의 미병합 커밋을 포함하지 않는다. #86의 Groq 3.74→4.43은 25개 측정이며, 이번 코드 변경만으로 새로운 품질 점수나 운영 전환율을 주장하지 않는다.

## 운영 동작

`TRANSLATION_PRIMARY_BUDGET_MS=30000`, `TRANSLATION_OPERATION_BUDGET_MS=90000`가 기본값이다. 한 OCR 영역의 최초 배치·언어별 복구는 같은 절대 deadline을 공유한다. OpenAI의 개별 요청 timeout 설정 60초보다 영역의 OpenAI deadline 30초가 먼저 적용된다. Groq가 없는 구성도 OpenAI 예산은 동일하다. Groq 단독 구성에는 전체 90초 예산이 적용된다. DB 저장의 네트워크 완료 시간 자체를 90초로 제한하는 설정은 아니다.

429·5xx·네트워크·형식 오류는 남은 예산 내에서 최대 `AI_MAX_RETRIES`회 시도한다. OpenAI의 Retry-After를 따르고, Groq는 기존 큐와 공유 cooldown을 사용한다. 남은 시간 안에 대기할 수 없으면 추가 HTTP 요청을 보내지 않는다. 401·403·404 등 영구 오류는 같은 공급자를 반복하지 않고 설정된 fallback으로 전환한다. 외부 취소 신호가 오면 fallback을 시작하지 않는다. 취소 신호는 내부 실행 컨텍스트로 전달할 수 있다; 별도 안정성 브랜치의 worker/task cancellation 연결은 해당 브랜치 통합 시 이 컨텍스트에 전달해야 한다.

로그는 `operationId`로 영역을, `callId`로 개별 배치·복구 호출을, `attempt`로 HTTP 시도를 연결한다. `translation_operation`, `translation_call`, `translation_attempt`, `translation_language` 이벤트에 원문·번역문·API 응답·키·오류 메시지를 넣지 않는다. 실제 공급자·모델·프롬프트 버전은 저장된 번역의 출처와 연결한다. 외부 응답 스키마와 DB 스키마는 바뀌지 않는다.

## 기존 Render 서비스의 로그 수집

현재 실행 환경의 Render 계정에는 Glocalizer 서비스가 없었다. 담당 계정으로 CLI 로그인한 뒤 기존 `glocalizer-api`의 서비스 ID와 배포 커밋, 실제 모델·키 설정 및 로그 보존 시작일을 확인한다. 새 Blueprint 생성은 과거 운영 로그 확보를 대체하지 않는다. `LOG_LEVEL=info` 이상으로 시작·성공 로그가 수집되어야 한다.

```sh
cd backend
render services --output json
npm run collect:translation-logs -- --service srv-실제서비스ID --days 14
```

수집기는 제한에 도달한 시간 구간을 재분할하고 경계 중복을 제거한다. 같은 timestamp에 한도를 넘는 로그가 있거나 최대 조회 횟수에 도달하면 `queryComplete=false`, 종료 코드 2로 표시한다. 공식 CLI에서 지원하지 않는 응답 형식은 실패로 처리한다. 파일에는 번역 이벤트의 허용된 필드만 남긴다. 파일과 coverage 메타데이터는 Git에서 제외되는 `benchmarks/translation/results/`에 저장된다.

확인한 로그 보존 시작일을 `--retained-from ISO시각`으로 전달할 수 있다. 이 값 없이 조회가 끝났다고 14일 보존이 확인됐다고 간주하지 않는다.

```sh
npm run report:translation-fallback -- \
  --input benchmarks/translation/results/production.jsonl \
  --coverage benchmarks/translation/results/production.jsonl.coverage.json \
  --now 수집메타데이터의to값 --days 14
```

`fallbackRate`는 관측된 OpenAI 시작 호출 중 Groq 시도 비율이다. `operations.fallbackRate`는 영역 단위 중복 제거 비율이고, `delivered.groqRate`는 실제 저장된 언어별 결과 중 Groq 비율이다. 직접 Groq 호출은 OpenAI 전환율 분모에 들어가지 않는다. 공급자 성공 로그만으로 저장 성공을 추정하지 않는다. 시작이 관측 기간 이전인 호출은 전체 trace를 집계에서 제외한다. 시작 로그 누락·보존 미확인은 `partial`, 호출 없음은 `unmeasured`와 null 비율로 표시한다. 운영 구성을 변경한 경우 변경 전후 기간을 따로 분석한다.

## 105개 품질 평가

실제 키는 `backend/.env` 또는 `--env-file`로 지정한 로컬 파일에 둔다. 평가는 DB·인증 설정 없이 실행된다. 현재 운영 구성은 `current-groq`, `current-openai`이고, `baseline`은 #86 이전 프롬프트·temperature 0.75를 사용하는 과거 비교용이다. 생성은 운영과 같은 요청 작성·파서·검증·재시도·큐·deadline 코드를 사용한다.

```sh
npm run benchmark:translation -- --dry-run --variants current-groq,current-openai
npm run benchmark:translation -- --dry-run --split dev \
  --variants current-groq,groq-v3-meaning,groq-v3-register
```

105개/12유형을 고정 seed로 개발 70개, 홀드아웃 35개로 분할한다. 두 Groq 전용 후보는 멀티라인·일상 은유·존댓말을 보강하며, 현재 운영 프롬프트는 유지된다. 출력 후보를 공급자·BEST 표시 없이 섞어 심사하고 원래 순서로 복구한다. 점수/언어/후보 수가 잘못된 심사 JSON은 실패로 처리한다. 생성 실패·심사 실패·예산 때문에 미평가된 행을 따로 집계한다. 신뢰구간은 문구 단위 bootstrap이며, LLM 심사가 사람의 품질 검토를 대신한다고 해석하지 않는다.

실측에는 최근 30일 안에 공식 단가를 확인한 JSON 배열이 필요하다. 각 항목은 다음 필드다. 아래 값의 `null`을 확인한 단가로 바꾸고, 실제 운영 모델과 심사 모델을 모두 넣는다. 단가는 100만 토큰당 USD이며 무료 계정도 공식 단가로 보수적으로 예약할 수 있다.

```json
[
  {
    "provider": "groq",
    "model": "qwen/qwen3.8-27b",
    "inputPerMillion": null,
    "outputPerMillion": null,
    "source": "https://console.groq.com/docs/models",
    "verifiedAt": "공식단가확인시각"
  },
  {
    "provider": "openai",
    "model": "gpt-5.6",
    "inputPerMillion": null,
    "outputPerMillion": null,
    "source": "https://openai.com/api/pricing/",
    "verifiedAt": "공식단가확인시각"
  }
]
```

키와 단가 확인 후 아래 순서로 진행한다. 모두 같은 `--ledger`를 사용해 총 10달러 상한을 공유한다. 기존 장부를 초기화하거나 다른 장부로 바꾸어 상한을 회피하지 않는다.

```sh
# 첫 실행을 3개로 점검한 후 --limit 3을 제거하여 Groq 105개 기준 평가
npm run benchmark:translation -- --variants current-groq --limit 3 \
  --prices /로컬/검증단가.json --budget-usd 10

# 같은 캐시·장부로 OpenAI 비교
npm run benchmark:translation -- --variants current-openai \
  --prices /로컬/검증단가.json --budget-usd 10

# 개발셋에서 최대 두 후보를 비교해 winner를 고정
npm run benchmark:translation -- --split dev --select \
  --variants current-groq,groq-v3-meaning,groq-v3-register \
  --prices /로컬/검증단가.json --budget-usd 10

# selection.json에 기록된 winner만 홀드아웃에서 검증
npm run benchmark:translation -- --split holdout \
  --variants current-groq,선택된winner \
  --selection benchmarks/translation/results/selection.json \
  --prices /로컬/검증단가.json --budget-usd 10
```

매 HTTP 시도 전에 최대 출력 토큰과 보수적인 입력 예산으로 비용을 장부에 먼저 기록한다. usage가 확인된 호출만 실제 사용량으로 정산하고, 응답 없는 실패/usage 누락은 예약 금액을 유지한다. 재개할 때 동일 cap·단가 snapshot을 요구하며, 동시 실행은 lock으로 차단한다. 강제 종료로 lock이 남았으면 기록된 PID의 프로세스가 끝났는지 확인한 뒤 lock만 정리한다; 장부와 미확인 예약은 보존한다. 예산 소진은 종료 코드 2이며 남은 평가를 미측정으로 표시한다. 캐시는 생성 설정·코드·입력, 심사 rubric·모델·입력으로 구분한다.

홀드아웃 35개가 모두 짝지어 평가되어야 한다. 채택 기준은 종합 +0.10 이상, 충실도 하락 없음, 언어별 종합 하락 0.10 이내, 검증 실패 증가 없음이다. 개발 winner 선택은 운영 적용이 아니다. `holdout-comparison.json`이 통과할 때만 Groq provider의 messages/promptVersion을 검증된 프로필로 변경하고 다시 검사한다. 예산 부족 또는 기준 미달이면 localization-v2를 유지한다. 같은 공개 데이터의 고정 분할이므로 결과를 미공개 실사용 데이터의 독립 검증이라고 주장하지 않는다.

## 검사와 배포

```sh
npm run build
npm run check:translation
npm test
```

모의 테스트는 30초 전환·90초 종료·취소·직렬 큐·429·형식/검증 오류·언어 복구 공통 예산·로그 중복/역순/누락·비용 예약과 재개·엄격한 심사·홀드아웃 채택 기준을 검증한다. 실제 API 호출과 운영 로그 분석은 별도다.

배포 전 PR에서 위 기본값과 기존 장시간 요청의 전환 동작을 검토한다. 배포 후 같은 14일 기준으로 운영 전환율, 전환 원인, 저장 성공률과 지연을 비교한다. 롤백은 이전 배포 커밋으로 되돌린다. 대기 정책만 긴급 복원하려면 primary budget을 183000ms, operation budget을 900000ms로 올려 예전 60초×3회와 Groq cooldown에 가까운 대기를 허용할 수 있다; 새 로그와 취소 처리는 유지되므로 전체 동작이 예전과 동일해지는 설정은 아니다.
