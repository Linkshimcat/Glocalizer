"""Report whether this host can run an OCR inference accelerator benchmark."""
from __future__ import annotations

import json
import platform
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class RuntimeStatus:
    available: bool
    devices: list[str]
    detail: str


def check_paddle_runtime() -> RuntimeStatus:
    try:
        import paddle
    except ImportError:
        return RuntimeStatus(False, [], "PaddlePaddle이 설치되지 않았습니다.")
    device = paddle.get_device()
    return RuntimeStatus(
        paddle.device.is_compiled_with_cuda(),
        [device],
        "CUDA 빌드 PaddlePaddle입니다." if paddle.device.is_compiled_with_cuda() else "CPU 빌드 PaddlePaddle입니다.",
    )


def check_openvino_npu() -> RuntimeStatus:
    try:
        import openvino as ov
    except ImportError:
        return RuntimeStatus(False, [], "OpenVINO가 설치되지 않았습니다. requirements.openvino.txt를 설치하세요.")
    devices = ov.Core().available_devices
    npu_devices = [device for device in devices if device.upper().startswith("NPU")]
    return RuntimeStatus(
        bool(npu_devices),
        npu_devices,
        "NPU를 OpenVINO에서 사용할 수 있습니다." if npu_devices else "OpenVINO는 설치됐지만 NPU 장치를 찾지 못했습니다.",
    )


def check_host_signals() -> RuntimeStatus:
    commands = [command for command in ("npu-smi", "xrt-smi") if shutil.which(command)]
    dxg_available = Path("/dev/dxg").exists()
    signals = commands + (["/dev/dxg"] if dxg_available else [])
    return RuntimeStatus(bool(signals), signals, "호스트 가속기 신호입니다. NPU 사용 가능 여부는 OpenVINO로 확정합니다.")


def main() -> None:
    openvino = check_openvino_npu()
    report = {
        "host": {"platform": platform.platform(), "machine": platform.machine()},
        "paddle": asdict(check_paddle_runtime()),
        "openvinoNpu": asdict(openvino),
        "hostSignals": asdict(check_host_signals()),
        "recommendedOcrRuntime": "openvino-npu" if openvino.available else "paddle-cpu",
        "nextStep": (
            "ONNX/OpenVINO 변환 모델로 정확도와 지연 시간을 Paddle 기준선과 비교하세요."
            if openvino.available
            else "현재 환경에서는 PaddleOCR CPU 기준선을 유지하세요. NPU 검증은 NPU 드라이버가 노출된 Windows 또는 Linux 호스트에서 실행하세요."
        ),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
