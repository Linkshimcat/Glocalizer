# OCR benchmark

## 가속기 사전 점검

기본 OCR은 PaddleOCR CPU로 실행한다. Intel NPU를 사용하는 것은 모델 학습이 아니라 **배포 추론 후보**로만 취급한다. 다음 명령은 OpenVINO NPU 장치, Paddle CUDA 상태, WSL 가속기 신호를 JSON으로 출력한다.

```bash
npm run ocr:accelerator-check
```

NPU가 검출된 호스트에서만 선택적으로 OpenVINO를 설치한다. 현재 서비스 모델을 변환하기 전에는 반드시 이 benchmark의 정확도·지연 시간 기준선을 먼저 기록한다.

```bash
python3 -m pip install -r python/requirements.openvino.txt
```

WSL에서는 Intel NPU가 직접 노출되지 않을 수 있다. Windows에 OpenVINO를 설치했다면 다음으로 NPU plugin을 별도 확인한다.

```bash
npm run ocr:windows-npu-check
```

NPU benchmark용 ONNX 파일은 저장소에 넣지 않고 로컬에서 생성한다. Paddle 모델 캐시가 내려받아진 뒤 다음 순서로 실행한다.

```bash
python3 -m pip install -r python/requirements.npu-export.txt
npm run ocr:npu:export
npm run ocr:npu:benchmark-rec
npm run ocr:npu:benchmark-det
```

recognition은 NPU의 정적 shape 제약에 맞춰 높이 48, 폭 640으로 고정한다. detection은 `1,3,1280,1280`으로 고정한다. 두 결과는 빈 입력 기반 장치 성능이며, 실제 배포 전에는 같은 실제 이미지 benchmark에서 Paddle CPU와 문구 정확도·전체 지연 시간을 비교해야 한다.

`manifest.example.json`을 `manifest.local.json`으로 복사해 사용자 제공 또는 상업 이용이 허가된 이미지 30장을 등록한다. 원본 이미지와 `manifest.local.json`은 기본적으로 커밋하지 않는다.

각 항목은 `expectedText`와 가능한 경우 실제 `regions.polygon`을 가진다. 정답 문구는 OCR 결과가 아니라 사람이 검수한 값이어야 한다.

```bash
cd backend
npm run dataset:generate                 # 합성 학습 표본 1,000장 생성
npm run benchmark:ocr                    # manifest.local.json 평가
```

보고서는 `benchmarks/ocr/reports/`에 JSON으로 생성된다. 학습 전에는 benchmark의 완전 일치율·CER을 기준선으로 저장하고, fine-tuning 뒤 같은 manifest로 비교한다.
