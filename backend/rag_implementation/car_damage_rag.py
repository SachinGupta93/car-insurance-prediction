from __future__ import annotations

import io
import json
import logging
import math
import re
import sys
from datetime import datetime
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv

# Ensure backend package import path
backend_dir = str(Path(__file__).parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api_key_manager import api_key_manager  # noqa: E402

logger = logging.getLogger(__name__)

# Load .env from backend first, then project root (without overriding)
backend_env = Path(__file__).parent.parent / ".env"
try:
    load_dotenv(backend_env)
except Exception as e:
    logger.warning(f"Could not load backend .env: {e}")

project_root_env = Path(__file__).parent.parent.parent / ".env"
try:
    if project_root_env.exists():
        load_dotenv(project_root_env, override=False)
except Exception as e:
    logger.warning(f"Could not load project root .env: {e}")


class CarDamageRAG:
    """Combines a pretrained CNN (YOLOv8) for region detection with Gemini for rich analysis."""

    def __init__(self) -> None:
        self.model: Optional[Any] = None
        self._yolo_model: Optional[Any] = None
        self._yolo_loaded_error: Optional[str] = None

        # Configure Gemini with API key rotation support
        api_key = api_key_manager.get_current_key()
        # Allow overriding model candidates via env (comma-separated)
        env_models = os.getenv("GEMINI_MODEL_CANDIDATES", "").strip()
        if env_models:
            model_candidates = [m.strip() for m in env_models.split(",") if m.strip()]
        else:
            # Prefer current public-access models first
            model_candidates = [
                "gemini-1.5-flash-8b",
                "gemini-1.5-flash-latest",
                "gemini-1.5-flash",
                "gemini-1.5-pro",
            ]

        if api_key:
            genai.configure(api_key=api_key)
            for m in model_candidates:
                try:
                    self.model = genai.GenerativeModel(m)
                    # Note: don't increment request count on mere init
                    logger.info(f"Initialized Gemini model: {m}")
                    break
                except Exception as e:
                    logger.warning(f"Failed to init {m}: {e}")
                    # Rotate key on quota errors
                    if any(k in str(e).lower() for k in ["quota", "429", "rate limit", "resource exhausted"]):
                        api_key_manager.record_quota_exceeded()
                        new_key = api_key_manager.get_current_key()
                        if new_key:
                            genai.configure(api_key=new_key)
                    else:
                        api_key_manager.record_error(f"model_init_{m}")
        if not self.model:
            raise RuntimeError("No Gemini model available. Check API keys and model access.")

    # ---------------- CNN (YOLOv8) helpers ----------------
    def _safe_import_ultralytics(self):
        try:
            from ultralytics import YOLO  # type: ignore
            return YOLO
        except Exception as e:
            logger.warning(f"Ultralytics import failed: {e}")
            return None

    def _load_yolo(self) -> None:
        if self._yolo_model is not None or self._yolo_loaded_error:
            return
        YOLO = self._safe_import_ultralytics()
        if YOLO is None:
            self._yolo_loaded_error = "Ultralytics not installed"
            return
        try:
            # A public pretrained vehicle-damage detection model; configurable via env for CPU speed
            model_name = os.getenv("VEHICLE_DAMAGE_YOLO_MODEL", "keremberke/yolov8m-vehicle-damage-detection")
            self._yolo_model = YOLO(model_name)
            logger.info("YOLOv8 vehicle-damage model loaded")
        except Exception as e:
            self._yolo_loaded_error = str(e)
            logger.warning(f"Failed to load YOLO model: {e}")

    @staticmethod
    def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
        return max(lo, min(hi, v))

    @staticmethod
    def _label_to_damage_type(lbl: str) -> str:
        l = (lbl or "").lower()
        if "dent" in l:
            return "Dent"
        if "scratch" in l:
            return "Scratch"
        if "crack" in l or "fracture" in l:
            return "Crack"
        if "glass" in l or "windshield" in l:
            return "Glass_Damage"
        if "bumper" in l:
            return "Bumper_Damage"
        if "headlight" in l or "taillight" in l or "light" in l:
            return "Light_Damage"
        if "paint" in l:
            return "Paint_Damage"
        return "Damage"

    @staticmethod
    def _severity_from_area(area_pct: float, conf: float) -> str:
        # area_pct: percentage 0-100; combine with confidence
        score = area_pct * (0.6 + 0.4 * conf)
        if score >= 10:
            return "severe"
        if score >= 4:
            return "moderate"
        return "minor"

    def _run_cnn(self, image_path: str, conf_thresh: float = 0.27) -> List[Dict[str, Any]]:
        try:
            # Allow disabling CNN via env to avoid heavy downloads in dev/CI
            if os.getenv("DISABLE_CNN", "false").lower() == "true":
                logger.info("DISABLE_CNN=true -> skipping YOLO inference")
                return []
            self._load_yolo()
            if not self._yolo_model:
                return []

            img = Image.open(image_path).convert("RGB")
            w, h = img.size

            results = self._yolo_model.predict(
                source=image_path,
                imgsz=640,
                conf=conf_thresh,
                max_det=30,
                verbose=False,
                stream=False,
                device="cpu",
            )
            if not results:
                return []
            res = results[0]
            names = getattr(self._yolo_model, "names", {})

            regions: List[Dict[str, Any]] = []
            for i, box in enumerate(getattr(res, "boxes", []) or []):
                try:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    bw = max(1.0, x2 - x1)
                    bh = max(1.0, y2 - y1)
                    rw = self._clamp((bw / w) * 100.0)
                    rh = self._clamp((bh / h) * 100.0)
                    cx = self._clamp((x1 / w) * 100.0)
                    cy = self._clamp((y1 / h) * 100.0)

                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    raw_label = names.get(cls_id, f"class_{cls_id}")
                    dmg_type = self._label_to_damage_type(raw_label)
                    area_pct = (rw * rh) / 100.0
                    severity = self._severity_from_area(area_pct, conf)

                    regions.append({
                        "id": f"cnn_{i+1}",
                        "x": round(cx, 2),
                        "y": round(cy, 2),
                        "width": round(rw, 2),
                        "height": round(rh, 2),
                        "damageType": dmg_type,
                        "rawLabel": raw_label,
                        "severity": severity,
                        "confidence": round(conf, 3),
                        "description": f"CNN detected {raw_label} ({dmg_type}) at {round(conf*100)}% confidence.",
                        "partName": "Unknown",
                    })
                except Exception:
                    continue

            logger.info(f"[CNN] detected {len(regions)} regions")
            return regions
        except Exception as e:
            logger.warning(f"CNN inference error: {e}")
            return []

    @staticmethod
    def _build_cnn_hint(cnn_regions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build a structured hint for the LLM with normalized boxes and labels.

        Schema:
        {
          "summary": { "total": n, "byType": { type: count } },
          "regions": [ { x, y, width, height, damageType, severity, confidence, rawLabel } ]
        }
        """
        counts: Dict[str, int] = {}
        for r in cnn_regions or []:
            t = r.get("damageType", "Damage")
            counts[t] = counts.get(t, 0) + 1
        regions = []
        for r in cnn_regions or []:
            regions.append({
                "x": float(r.get("x", 0)),
                "y": float(r.get("y", 0)),
                "width": float(r.get("width", 0)),
                "height": float(r.get("height", 0)),
                "damageType": r.get("damageType", "Damage"),
                "severity": r.get("severity", "moderate"),
                "confidence": float(r.get("confidence", 0)),
                "rawLabel": r.get("rawLabel", "unknown"),
            })
        return {
            "summary": {"total": len(cnn_regions or []), "byType": counts},
            "regions": regions,
        }

    @staticmethod
    def _merge_regions(ai_regions: List[Dict[str, Any]], cnn_regions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        merged: List[Dict[str, Any]] = []
        seen_ids = set()
        for r in (ai_regions or []):
            rid = r.get("id") or f"ai_{len(merged)+1}"
            r["id"] = rid
            merged.append(r)
            seen_ids.add(rid)
        for r in (cnn_regions or []):
            rid = r.get("id") or f"cnn_{len(merged)+1}"
            if rid in seen_ids:
                rid = f"{rid}_cnn"
            r["id"] = rid
            merged.append(r)
        return merged

    def _prepare_image(self, image_path: str) -> Image.Image:
        img = Image.open(image_path)
        if img.mode != "RGB":
            img = img.convert("RGB")
        # Compress to keep under ~4MB for Gemini
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85, optimize=True)
        if len(buf.getvalue()) > 4000000:
            ratio = math.sqrt(4000000 / len(buf.getvalue()))
            new_size = (max(1, int(img.width * ratio)), max(1, int(img.height * ratio)))
            img = img.resize(new_size, Image.LANCZOS)
        return img

    def _call_gemini(self, img: Image.Image, cnn_hint: Dict[str, Any]) -> str:
        generation_config = genai.types.GenerationConfig(
            temperature=0.2,
            max_output_tokens=2048,
            candidate_count=1,
            top_p=0.95,
            top_k=40,
        )
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
        ]

        system_prompt = (
            "You are an expert automotive damage assessor. First provide a concise human-readable summary (3-6 lines), then provide a single JSON object exactly.\n"
            "Summary must include: whether the vehicle is damaged, total detected regions, average confidence, and 1 short line per region with part and type.\n"
            "JSON contract (strict): Return ONE object with keys:\n"
            "- vehicleIdentification: { make, model, year, trimLevel, bodyStyle, confidence (0-1) }.\n"
            "- damageAssessment: { isDamaged: boolean, overallSeverity: one of [none, minor, moderate, severe], rationale: short string }.\n"
            "- identifiedDamageRegions: array of regions. Each item has { x, y, width, height } in 0-100 relative coords, and fields: damageType, severity in {minor, moderate, severe}, confidence (0-1), description (<=120 chars), partName.\n"
            "- enhancedRepairCost: { conservative: number, comprehensive: number, premium?: number, laborHours: number, breakdown: { parts: number, labor: number, materials?: number }, regionalVariations: { metro: number, tier1: number, tier2: number } }.\n"
            "- mandatoryOutput: a second view of the analysis conforming EXACTLY to the following structure (use INR amounts as plain numbers and include USD equivalent as number): {\n"
            "    vehicleInformation: { make, model, estimatedYear, marketSegment, estimatedValue },\n"
            "    damageAssessment: { overallSeverity: [Minor|Moderate|Severe|Critical], totalDamageRegions: number, safetyImpact: [None|Minor|Significant|Critical], drivabilityStatus: [Normal|Restricted|Unsafe] },\n"
            "    identifiedDamageRegions: [ { regionId, coordinates: { x, y, width, height }, damageClassification: { primaryType, severity, confidence, affectedPercentage }, technicalDetails: { componentName, materialType, damageDepth, affectedLayers }, repairSpecification: { repairMethod, partReplacement, specializedEquipment, estimatedTime }, costEstimation: { partsCost, laborCost, materialsCost, totalCost, currencyUSD } } ],\n"
            "    comprehensiveCostSummary: { totalPartsCost, totalLaborCost, totalMaterialsCost, grandTotalRepair, serviceOptions: { authorizedServiceCenter, multiBrandWorkshop, localGarage } },\n"
            "    insuranceRecommendation: { recommendationStatus: [CLAIM_RECOMMENDED|CASH_PAYMENT_OPTIMAL|CONDITIONAL_CLAIM], decisionConfidence: [High|Medium|Low], financialAnalysis: string, riskAssessment: string, rationale: string, actionPlan: { documentation, serviceCenter, repairTimeline, partsStrategy, qualityAssurance }, safetyProtocol: { drivingSafetyStatus: [SAFE|CAUTION_REQUIRED|UNSAFE_TO_DRIVE], criticalRepairs: string, temporaryMeasures: string, professionalInspection: string } }\n"
            "  }.\n"
            "Constraints: Prefer damageType in [Scratch, Dent, Crack, Glass_Damage, Bumper_Damage, Light_Damage, Paint_Damage]. Avoid duplicate overlapping boxes; align with provided CNN regions when reasonable. Output plain JSON after the summary."
        )

        contents: List[Any] = [system_prompt]
        if cnn_hint:
            try:
                contents.append("CNN_DETECTIONS_JSON:" + json.dumps(cnn_hint, ensure_ascii=False))
            except Exception:
                contents.append(f"[CNN Summary] {cnn_hint}")
        contents.append(img)

        # Try up to 3 attempts with API key rotation on quota errors
        last_err: Optional[Exception] = None
        for attempt in range(3):
            try:
                response = self.model.generate_content(
                    contents=contents,
                    generation_config=generation_config,
                    safety_settings=safety_settings,
                )
                api_key_manager.record_successful_request()
                return response.text or ""
            except Exception as e:
                last_err = e
                msg = str(e).lower()
                quota = any(k in msg for k in ["quota", "429", "rate limit", "resource exhausted"])
                notfound = any(k in msg for k in ["not found", "was not found", "unsupported", "does not have access"])  # model name access
                if (quota or notfound) and attempt < 2:
                    if quota:
                        api_key_manager.record_quota_exceeded()
                        new_key = api_key_manager.get_current_key()
                        if new_key:
                            genai.configure(api_key=new_key)
                    # Try switching to a broadly accessible model on NotFound
                    try_models = [
                        "gemini-1.5-flash-8b",
                        "gemini-1.5-flash-latest",
                        "gemini-1.5-flash",
                        "gemini-1.5-pro",
                    ]
                    for m in try_models:
                        try:
                            self.model = genai.GenerativeModel(m)
                            logger.info(f"Switched Gemini model to: {m}")
                            break
                        except Exception:
                            continue
                    continue
                api_key_manager.record_error(f"analysis_error_{attempt}")
                break
        if last_err:
            raise last_err
        return ""

    @staticmethod
    def _extract_top_level_json(text: str) -> Optional[Dict[str, Any]]:
        """Extract the first top-level JSON object from mixed text reliably by brace matching."""
        if not text:
            return None
        # Prefer fenced ```json blocks
        fenced = re.search(r"```json\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        candidates: List[str] = []
        if fenced:
            candidates.append(fenced.group(1))
        # Also consider any substring that forms a balanced JSON object
        s = text
        start_idx = None
        depth = 0
        for i, ch in enumerate(s):
            if ch == '{':
                if depth == 0:
                    start_idx = i
                depth += 1
            elif ch == '}':
                if depth > 0:
                    depth -= 1
                    if depth == 0 and start_idx is not None:
                        candidates.append(s[start_idx:i+1])
                        start_idx = None
        for cand in candidates:
            try:
                obj = json.loads(cand)
                if isinstance(obj, dict):
                    return obj
            except Exception:
                continue
        return None

    @classmethod
    def _parse_ai_structured(cls, text: str) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "identifiedDamageRegions": [],
            "vehicleIdentification": {},
            "damageAssessment": {},
            "enhancedRepairCost": {},
            "mandatoryOutput": {},
        }
        if not text:
            return data
        obj = cls._extract_top_level_json(text)
        if not obj:
            # Fallback: try to extract only regions array with regex
            try:
                match = re.search(r'"identifiedDamageRegions"\s*:\s*(\[[\s\S]*?\])', text)
                if match:
                    arr = json.loads(match.group(1))
                    if isinstance(arr, list):
                        obj = {"identifiedDamageRegions": arr}
            except Exception:
                pass
        if not obj:
            return data

    # Normalize regions (flat shape)
        regions_in = obj.get("identifiedDamageRegions", []) or []
        regions: List[Dict[str, Any]] = []
        for i, r in enumerate(regions_in):
            if not isinstance(r, dict):
                continue
            try:
                regions.append({
                    "id": r.get("id", f"ai_{i+1}"),
                    "x": float(r.get("x", 20)),
                    "y": float(r.get("y", 20)),
                    "width": float(r.get("width", 30)),
                    "height": float(r.get("height", 20)),
                    "damageType": r.get("damageType", "Damage"),
                    "severity": r.get("severity", "moderate"),
                    "confidence": float(r.get("confidence", 0.7)),
                    "description": r.get("description", f"{r.get('damageType', 'Damage')} detected"),
                    "partName": r.get("partName", "Unknown"),
                })
            except Exception:
                continue
        data["identifiedDamageRegions"] = regions

        # Also capture mandatoryOutput if present
        mo = obj.get("mandatoryOutput") or {}
        if isinstance(mo, dict):
            # Preserve as-is for clients that render the detailed report
            data["mandatoryOutput"] = mo
            # If mandatoryOutput has its own identifiedDamageRegions (nested schema), keep it too
            try:
                mo_regions = mo.get("identifiedDamageRegions", []) or []
                # Best-effort map to flat regions if our flat list is empty
                if not regions and isinstance(mo_regions, list):
                    mapped: List[Dict[str, Any]] = []
                    for i, r in enumerate(mo_regions):
                        coords = (r.get("coordinates") or {})
                        dclass = (r.get("damageClassification") or {})
                        mapped.append({
                            "id": r.get("regionId", f"ai_{i+1}"),
                            "x": float(coords.get("x", 20)),
                            "y": float(coords.get("y", 20)),
                            "width": float(coords.get("width", 30)),
                            "height": float(coords.get("height", 20)),
                            "damageType": dclass.get("primaryType", "Damage"),
                            "severity": (dclass.get("severity", "moderate")).lower(),
                            "confidence": float(dclass.get("confidence", 0.7)),
                            "description": r.get("repairSpecification", {}).get("repairMethod", dclass.get("primaryType", "Damage")),
                            "partName": (r.get("technicalDetails", {}) or {}).get("componentName", "Unknown"),
                        })
                    if mapped:
                        data["identifiedDamageRegions"] = mapped
            except Exception:
                pass

        # Vehicle identification
        vi = obj.get("vehicleIdentification") or obj.get("vehicleInformation") or {}
        if isinstance(vi, dict):
            try:
                data["vehicleIdentification"] = {
                    "make": vi.get("make", "Unknown"),
                    "model": vi.get("model", "Unknown"),
                    "year": vi.get("year", "Unknown"),
                    "trimLevel": vi.get("trimLevel", "Unknown"),
                    "bodyStyle": vi.get("bodyStyle", "Unknown"),
                    "confidence": float(vi.get("confidence", 0.6)),
                }
            except Exception:
                data["vehicleIdentification"] = vi

        # Damage assessment
        da = obj.get("damageAssessment") or {}
        if isinstance(da, dict):
            data["damageAssessment"] = {
                "isDamaged": bool(da.get("isDamaged", len(regions) > 0)),
                "overallSeverity": da.get("overallSeverity", "minor" if regions else "none"),
                "rationale": da.get("rationale", "Assessment based on detected regions and visual cues."),
            }

    # Enhanced repair cost
        erc = obj.get("enhancedRepairCost") or {}
        if isinstance(erc, dict):
            def _to_float(x: Any, default: float = 0.0) -> float:
                try:
                    return float(x)
                except Exception:
                    return default
            breakdown = erc.get("breakdown", {}) or {}
            regional = erc.get("regionalVariations", {}) or {}
            data["enhancedRepairCost"] = {
                "conservative": _to_float(erc.get("conservative", 0)),
                "comprehensive": _to_float(erc.get("comprehensive", 0)),
                "premium": _to_float(erc.get("premium", 0)),
                "laborHours": _to_float(erc.get("laborHours", 0)),
                "breakdown": {
                    "parts": _to_float(breakdown.get("parts", 0)),
                    "labor": _to_float(breakdown.get("labor", 0)),
                    "materials": _to_float(breakdown.get("materials", 0)),
                },
                "regionalVariations": {
                    "metro": _to_float(regional.get("metro", 0)),
                    "tier1": _to_float(regional.get("tier1", 0)),
                    "tier2": _to_float(regional.get("tier2", 0)),
                },
            }

        # Pass through additional blocks if provided for client rendering
        if "vehicleInformation" not in data and obj.get("vehicleInformation"):
            data["vehicleInformation"] = obj.get("vehicleInformation")
        if obj.get("comprehensiveCostSummary"):
            data["comprehensiveCostSummary"] = obj.get("comprehensiveCostSummary")
        if obj.get("insuranceRecommendation"):
            data["insuranceRecommendation"] = obj.get("insuranceRecommendation")

        return data

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        if not self.model:
            raise RuntimeError("Gemini model is not initialized")

        logger.info(f"Analyzing image: {image_path}")
        # Run CNN first
        cnn_regions = self._run_cnn(image_path, conf_thresh=0.27)
        cnn_hint_obj = self._build_cnn_hint(cnn_regions) if cnn_regions else {"summary": {"total": 0, "byType": {}}, "regions": []}

        # Prepare image and call Gemini
        img = self._prepare_image(image_path)
        ai_text = self._call_gemini(img, cnn_hint_obj)
        ai_structured = self._parse_ai_structured(ai_text)
        ai_regions = ai_structured.get("identifiedDamageRegions", [])

        merged = self._merge_regions(ai_regions, cnn_regions)

        # Simple confidence heuristic
        confidence = 0.85 if merged else 0.6

        # Derive damage assessment if missing
        damage_assessment = ai_structured.get("damageAssessment", {}) or {}
        if not damage_assessment:
            overall_sev = "none"
            if merged:
                sev_rank = {"minor": 1, "moderate": 2, "severe": 3}
                max_rank = 0
                for r in merged:
                    max_rank = max(max_rank, sev_rank.get((r.get("severity") or "").lower(), 1))
                overall_sev = {0: "none", 1: "minor", 2: "moderate", 3: "severe"}.get(max_rank, "minor")
            damage_assessment = {
                "isDamaged": bool(merged),
                "overallSeverity": overall_sev,
                "rationale": "Computed from merged AI+CNN regions.",
            }

        vehicle_identification = ai_structured.get("vehicleIdentification", {}) or {
            "make": "Unknown", "model": "Unknown", "year": "Unknown", "trimLevel": "Unknown", "bodyStyle": "Unknown", "confidence": 0.5,
        }
        enhanced_repair_cost = ai_structured.get("enhancedRepairCost", {}) or {
            "conservative": 0.0, "comprehensive": 0.0, "premium": 0.0, "laborHours": 0.0,
            "breakdown": {"parts": 0.0, "labor": 0.0, "materials": 0.0},
            "regionalVariations": {"metro": 0.0, "tier1": 0.0, "tier2": 0.0},
        }

        return {
            "raw_analysis": ai_text,
            "analysis": ai_text,
            "identifiedDamageRegions": merged,
            "mandatoryOutput": ai_structured.get("mandatoryOutput", {}),
            "vehicleInformation": ai_structured.get("vehicleInformation", {}),
            "comprehensiveCostSummary": ai_structured.get("comprehensiveCostSummary", {}),
            "insuranceRecommendation": ai_structured.get("insuranceRecommendation", {}),
            "vehicleIdentification": vehicle_identification,
            "damageAssessment": damage_assessment,
            "enhancedRepairCost": enhanced_repair_cost,
            "confidence": confidence,
            "model": "gemini-1.5-flash",
            "analysisSources": {"ai": True, "cnn": bool(cnn_regions)},
            "cnnRegionCount": len(cnn_regions),
            "timestamp": datetime.now().isoformat(),
        }

    # Backward-compatible method name used by routes
    def analyze_car_damage(self, image_path: str) -> Dict[str, Any]:
        return self.analyze_image(image_path)
