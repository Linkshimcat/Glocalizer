"""Run on Windows Python to verify the Intel OpenVINO NPU plugin."""
from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path

import numpy as np
import openvino as ov


def measure_npu_inference(compiled: ov.CompiledModel, input_shape: list[int], run_count: int) -> float | None:
    if run_count <= 0:
        return None
    input_tensor = np.zeros(input_shape, dtype=np.float32)
    compiled([input_tensor])
    durations = []
    for _ in range(run_count):
        started = time.perf_counter()
        compiled([input_tensor])
        durations.append((time.perf_counter() - started) * 1000)
    return round(statistics.median(durations), 2)


def read_model_summary(
    core: ov.Core,
    model_path: Path,
    static_width: int | None,
    static_shape: list[int] | None,
    run_count: int,
) -> dict[str, object]:
    model = core.read_model(model_path)
    if static_shape:
        model.reshape({model.input(0): static_shape})
    elif static_width:
        model.reshape({model.input(0): [1, 3, 48, static_width]})
    inputs = [
        {"name": port.get_any_name(), "shape": str(port.partial_shape), "elementType": str(port.element_type)}
        for port in model.inputs
    ]
    try:
        compiled = core.compile_model(model, "NPU")
        input_shape = list(model.input(0).shape)
        return {
            "path": str(model_path),
            "inputs": inputs,
            "npuCompile": "ok",
            "outputs": len(compiled.outputs),
            "medianInferenceMs": measure_npu_inference(compiled, input_shape, run_count),
        }
    except RuntimeError as error:
        return {"path": str(model_path), "inputs": inputs, "npuCompile": "failed", "compileError": str(error)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path)
    parser.add_argument("--static-width", type=int)
    parser.add_argument("--static-shape", type=lambda value: [int(dim) for dim in value.split(",")])
    parser.add_argument("--runs", type=int, default=0)
    args = parser.parse_args()
    core = ov.Core()
    devices = list(core.available_devices)
    npu_available = "NPU" in devices
    report = {
        "openvinoVersion": ov.__version__,
        "devices": devices,
        "npuAvailable": npu_available,
        "npuName": core.get_property("NPU", "FULL_DEVICE_NAME") if npu_available else None,
    }
    if args.model:
        report["model"] = read_model_summary(core, args.model, args.static_width, args.static_shape, args.runs)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
