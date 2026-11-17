import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  Clock,
  Crosshair,
  FileText,
  Loader2,
  MapPin,
  MessageCircleHeart,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import { MYTH_CARDS, PH_ZONES, PhZoneId } from '../data/jamakissData';
import {
  autoDetectDropAndBackground,
  classifyJamaKissColor,
  ColorimetryResult,
  RGB,
  sampleCanvasRegion,
} from '../engine/colorimetry';
import {
  CompressedImagePayload,
  compressImageForVision,
} from '../engine/imageCompressor';
import {
  ClinicalAssessment,
  CYCLE_LABELS,
  CycleOption,
  FLOW_LABELS,
  FlowOption,
  SYMPTOM_LABELS,
  SymptomOption,
  TriageInput,
} from '../engine/clinicalTriage';

interface AnalyzerModuleProps {
  discreetMode: boolean;
  triageInput: TriageInput;
  assessment: ClinicalAssessment;
  colorResult: ColorimetryResult | null;
  geminiEnabled: boolean;
  onUpdateTriage: (patch: Partial<TriageInput>) => void;
  onColorResultChange: (res: ColorimetryResult | null) => void;
  onOpenCenters: () => void;
  onOpenScreeningSheet: () => void;
  onOpenChatWithContext: () => void;
}

type PickMode = 'drop' | 'white';

interface VisionFeedback {
  validSample: boolean;
  zoneId: PhZoneId;
  estimatedPh: string;
  confidence: number;
  lightingQuality: 'buena' | 'aceptable' | 'mejorable';
  lightingNote: string;
  visualDescription: string;
  nextStepAdvice: string;
  model?: string;
}

export const AnalyzerModule: React.FC<AnalyzerModuleProps> = ({
  discreetMode,
  triageInput,
  assessment,
  colorResult,
  geminiEnabled,
  onUpdateTriage,
  onColorResultChange,
  onOpenCenters,
  onOpenScreeningSheet,
  onOpenChatWithContext,
}) => {
  // Temporizador 30–60s con Mitos vs Realidades
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [mythIndex, setMythIndex] = useState(0);
  const [showTimerPanel, setShowTimerPanel] = useState(false);

  // Escáner visual + compresión GPU + Gemini 2.5 Flash automático
  const [compressedImg, setCompressedImg] = useState<CompressedImagePayload | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>('drop');
  const [dropPoint, setDropPoint] = useState<{ x: number; y: number } | null>(null);
  const [whitePoint, setWhitePoint] = useState<{ x: number; y: number } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionFeedback, setVisionFeedback] = useState<VisionFeedback | null>(null);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [justInfoAck, setJustInfoAck] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          setTimerDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (!timerRunning) return;
    const cardInterval = window.setInterval(() => {
      setMythIndex((prev) => (prev + 1) % MYTH_CARDS.length);
    }, 11000);
    return () => window.clearInterval(cardInterval);
  }, [timerRunning]);

  const recalcFromPoints = (
    dPt: { x: number; y: number } | null,
    wPt: { x: number; y: number } | null
  ): ColorimetryResult | null => {
    const canvas = canvasRef.current;
    if (!canvas || !dPt) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const sampleRgb: RGB = sampleCanvasRegion(ctx, dPt.x, dPt.y, 9);
    const whiteRgb: RGB | null = wPt ? sampleCanvasRegion(ctx, wPt.x, wPt.y, 9) : null;
    const result = classifyJamaKissColor(sampleRgb, whiteRgb);

    onColorResultChange(result);
    onUpdateTriage({ zoneId: result.zone.id });
    return result;
  };

  const runGeminiVision = async (
    payload: CompressedImagePayload,
    localRes: ColorimetryResult | null
  ) => {
    if (!geminiEnabled) return;
    setVisionLoading(true);
    setVisionError(null);
    try {
      const res = await fetch('/api/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: payload.base64,
          mimeType: payload.mimeType,
          localHint: localRes
            ? {
                hex: localRes.hex,
                zoneId: localRes.zone.id,
                whiteBalanced: localRes.whiteBalanced,
              }
            : null,
        }),
      });
      if (!res.ok) throw new Error('Error en Gemini Vision');
      const data: VisionFeedback = await res.json();
      setVisionFeedback(data);
      if (data.validSample && data.zoneId) {
        onUpdateTriage({ zoneId: data.zoneId });
      }
    } catch {
      setVisionError(null);
    } finally {
      setVisionLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVisionFeedback(null);
    setVisionError(null);
    setJustInfoAck(false);
    setIsScanning(true);

    try {
      // 1) Compresión GPU en el navegador (máx 512px, JPEG 0.72 -> ~15-35 KB)
      const payload = await compressImageForVision(file, 512, 0.72);
      setCompressedImg(payload);

      // 2) Render en canvas interactivo + lectura CIE L*a*b* local inmediata
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        let localRes: ColorimetryResult | null = null;
        if (canvas) {
          canvas.width = payload.width;
          canvas.height = payload.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0, payload.width, payload.height);
            const detected = autoDetectDropAndBackground(canvas);
            setDropPoint(detected.dropPoint);
            setWhitePoint(detected.bgPoint);
            localRes = recalcFromPoints(detected.dropPoint, detected.bgPoint);
          }
        }
        setIsScanning(false);

        // 3) Análisis automático con Gemini 2.5 Flash Vision usando la imagen comprimida
        if (geminiEnabled) {
          runGeminiVision(payload, localRes);
        }
      };
      img.src = payload.dataUrl;
    } catch {
      setIsScanning(false);
      setVisionError('No pudimos leer esa imagen. Intenta con otra fotografía en formato JPG o PNG.');
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    if (pickMode === 'drop') {
      const nextDrop = { x, y };
      setDropPoint(nextDrop);
      recalcFromPoints(nextDrop, whitePoint);
    } else {
      const nextWhite = { x, y };
      setWhitePoint(nextWhite);
      recalcFromPoints(dropPoint, nextWhite);
      setPickMode('drop');
    }
  };

  const handleClearImage = () => {
    setCompressedImg(null);
    setDropPoint(null);
    setWhitePoint(null);
    setVisionFeedback(null);
    setVisionError(null);
    onColorResultChange(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleManualZoneSelect = (zoneId: PhZoneId) => {
    setJustInfoAck(false);
    setVisionFeedback(null);
    onColorResultChange(null);
    onUpdateTriage({ zoneId });
  };

  const toggleSymptom = (symptom: SymptomOption) => {
    setJustInfoAck(false);
    if (symptom === 'sin_molestias') {
      onUpdateTriage({ symptoms: ['sin_molestias'] });
      return;
    }
    const withoutNone = triageInput.symptoms.filter((s) => s !== 'sin_molestias');
    const exists = withoutNone.includes(symptom);
    const next = exists ? withoutNone.filter((s) => s !== symptom) : [...withoutNone, symptom];
    onUpdateTriage({ symptoms: next.length > 0 ? next : ['sin_molestias'] });
  };

  const activeMyth = MYTH_CARDS[mythIndex];

  return (
    <div className="space-y-6 fade-in-up">
      {/* Portada limpia armonizada con el logo JamaKiss */}
      <div className="rounded-3xl bg-white border border-[#EFE2E6] p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="shrink-0 bg-white rounded-2xl px-3 py-1.5 flex items-center justify-center">
              <img
                src="/jamakiss-logo.jpg"
                alt="JamaKiss - Gel Íntimo Bienestar Natural"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>

            <div className="space-y-1 sm:pl-4 sm:border-l sm:border-[#F0E4E8]">
              <h1 className="font-brand text-2xl sm:text-[26px] font-semibold tracking-tight text-[#5E0E26] leading-tight">
                {discreetMode ? 'Evaluación de Bienestar' : 'Evaluación Colorimétrica de pH'}
              </h1>
              <p className="text-xs sm:text-sm text-[#6A4F59] max-w-xl leading-relaxed">
                {discreetMode
                  ? 'Sube una foto de tu prueba sobre papel blanco o selecciona el tono más parecido para ver tu orientación.'
                  : <>Espacio privado, anónimo y libre de juicios. Sube la foto de tu prueba externa <em>in vitro</em> sobre papel blanco o compara visualmente el tono de tu gel.</>}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTimerPanel((v) => !v)}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#FFF5F8] border border-[#EAE0E3] text-xs font-medium text-[#5E0E26] transition-colors"
          >
            <Clock className="w-4 h-4 text-[#8E1436]" />
            {showTimerPanel ? 'Ocultar guía y temporizador' : 'Cómo hacer la prueba (45s)'}
          </button>
        </div>
      </div>

      {/* Módulo desplegable: Protocolo in vitro + Temporizador de 45s con Mitos vs Realidades */}
      {showTimerPanel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-white rounded-3xl border border-[#EFE2E6] p-5 shadow-xs fade-in-up">
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#5E0E26]">
                Cómo hacer la prueba externa segura (<em>in vitro</em>)
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                Solo uso externo
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-[11px] text-[#5B454D]">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE6E2] space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-[#E6005C] mx-auto shadow-inner border-2 border-white ring-1 ring-[#F7CDDC]" />
                <p className="font-semibold text-center text-[#28161C]">1. Gota fucsia</p>
                <p className="text-center leading-snug">Coloca una gota sobre portaobjetos o papel blanco.</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE6E2] space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-[#FCE8EF] text-[#8E1436] mx-auto flex items-center justify-center font-bold border border-[#F7CDDC]">
                  +
                </div>
                <p className="font-semibold text-center text-[#28161C]">2. Hisopo estéril</p>
                <p className="text-center leading-snug">Aplica una pequeña muestra externa sobre la gota.</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EFE6E2] space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-[#7A003D] text-white mx-auto flex items-center justify-center text-[10px] font-bold">
                  45s
                </div>
                <p className="font-semibold text-center text-[#28161C]">3. Espera y lee</p>
                <p className="text-center leading-snug">Espera 30–60 s y tómale foto con luz natural.</p>
              </div>
            </div>
            <p className="text-[11px] text-amber-950 bg-amber-50/90 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
              <strong>Seguridad del prototipo artesanal:</strong> No debe introducirse directamente en el canal vaginal porque contiene azúcares naturales residuales y carece de esterilidad industrial.
            </p>
          </div>

          <div className="lg:col-span-6 rounded-2xl bg-gradient-to-br from-[#FFF6F9] to-[#F7F2F5] border border-[#F2D5DF] p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E1436]">
                  Temporizador de reacción (30 – 60 s)
                </p>
                <p className="text-2xl font-bold font-mono text-[#28161C] mt-0.5">
                  00:{String(timerSeconds).padStart(2, '0')}
                  {timerDone && (
                    <span className="ml-2 text-xs font-sans font-semibold text-[#556638] bg-[#F2F5EC] px-2 py-0.5 rounded-full border border-[#D4DFC1]">
                      ¡Lista para leer!
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (timerDone) {
                      setTimerSeconds(45);
                      setTimerDone(false);
                    }
                    setTimerRunning((r) => !r);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8E1436] hover:bg-[#72112E] text-white text-xs font-semibold transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  {timerRunning ? 'Pausar' : timerDone ? 'Reiniciar' : 'Ya apliqué la muestra'}
                </button>
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerDone(false);
                    setTimerSeconds(45);
                  }}
                  className="p-2 rounded-xl bg-white border border-[#EBD2DC] text-[#7D3252] hover:bg-[#FFF5F8]"
                  aria-label="Reiniciar temporizador"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-white/95 rounded-xl border border-[#F0D8E2] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A51942] inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Mientras esperas • {activeMyth.tag}
                </span>
                <button
                  onClick={() => setMythIndex((i) => (i + 1) % MYTH_CARDS.length)}
                  className="text-[11px] font-semibold text-[#7D3252] hover:underline"
                >
                  Siguiente dato →
                </button>
              </div>
              <p className="text-xs font-semibold text-[#28161C]">{activeMyth.question}</p>
              <p className="text-[11px] text-[#5B454D] leading-relaxed">{activeMyth.answer}</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TARJETA 1: ESCÁNER CON COMPRESIÓN GPU + GEMINI 2.5 FLASH + CIE LAB */}
          <div className="bg-white rounded-3xl border border-[#EFE2E6] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#28161C]">
                1. Muestra de color
              </h2>
              <span className="text-[11px] text-[#7A616A]">
                Tu foto se analiza al instante y no se guarda
              </span>
            </div>

            {!compressedImg ? (
              <div className="border-2 border-dashed border-[#E4CBD4] rounded-2xl p-5 sm:p-7 flex flex-col items-center justify-center text-center bg-[#FAF8F5]">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {/* Ilustración visual amigable (no real) de cómo fotografiar la gota */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-14 h-11 rounded-xl bg-white border border-[#E8D5DC] shadow-2xs flex items-center justify-center">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF1A66] to-[#8E1436] shadow-inner" />
                    </div>
                    <span className="text-[10px] font-medium text-[#7A616A] whitespace-nowrap">
                      Papel blanco
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-[#FCE8EF] border border-[#F7CDDC] flex items-center justify-center text-[#8E1436] mb-3.5">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-sm font-semibold text-[#28161C]">
                  Analiza la foto de tu muestra JamaKiss
                </p>
                <p className="mt-1 text-xs text-[#6A4F59] max-w-md leading-relaxed">
                  Coloca una gota de gel sobre <strong>papel blanco o portaobjetos</strong> con buena luz natural. No se guarda en ningún lugar.
                </p>

                <div className="mt-4 w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8E1436] hover:bg-[#72112E] active:scale-[0.99] text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    Tomar foto ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF5F8] active:scale-[0.99] text-[#5E0E26] border border-[#E5D5DC] text-xs font-semibold transition-all"
                  >
                    Elegir de galería
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Controles de ajuste simple */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAF8F5] px-3.5 py-2 rounded-xl border border-[#EFE2E6]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPickMode('drop')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        pickMode === 'drop'
                          ? 'bg-[#8E1436] text-white'
                          : 'bg-white text-[#5B454D] border border-[#E5D5DC]'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      Señalar gota
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickMode('white')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        pickMode === 'white'
                          ? 'bg-sky-700 text-white'
                          : 'bg-white text-[#5B454D] border border-[#E5D5DC]'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Ajustar luz (papel blanco)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A51942] hover:text-[#72112E]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar foto
                  </button>
                </div>

                {/* Canvas interactivo */}
                <div className="relative rounded-2xl overflow-hidden border border-[#E8D5DC] bg-[#F3EEEB] flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="max-w-full max-h-[290px] w-auto h-auto cursor-crosshair block"
                  />

                  {canvasRef.current && dropPoint && (
                    <div
                      className="pointer-events-none absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white shadow-md ring-2 ring-[#E6005C]"
                      style={{
                        left: `${(dropPoint.x / canvasRef.current.width) * 100}%`,
                        top: `${(dropPoint.y / canvasRef.current.height) * 100}%`,
                        backgroundColor: colorResult?.hex ? `${colorResult.hex}55` : 'transparent',
                      }}
                    />
                  )}
                  {canvasRef.current && whitePoint && (
                    <div
                      className="pointer-events-none absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-sky-500 bg-white/60 shadow-sm"
                      style={{
                        left: `${(whitePoint.x / canvasRef.current.width) * 100}%`,
                        top: `${(whitePoint.y / canvasRef.current.height) * 100}%`,
                      }}
                    />
                  )}

                  {(isScanning || visionLoading) && (
                    <div className="absolute inset-0 bg-[#5E0E26]/20 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="bg-white/95 px-4 py-2 rounded-full text-xs font-semibold text-[#72112E] shadow-md inline-flex items-center gap-2 border border-[#F7CDDC]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A51942]" />
                        Analizando el tono de tu muestra...
                      </span>
                    </div>
                  )}
                </div>

                {/* Resumen visual limpio */}
                {colorResult && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EFE2E6] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-xl border border-black/10 shadow-inner shrink-0"
                        style={{ backgroundColor: colorResult.hex }}
                      />
                      <div>
                        <p className="text-xs font-bold text-[#28161C]">
                          Tono detectado: {colorResult.zone.colorName}
                        </p>
                        <p className="text-[11px] text-[#6A4F59]">
                          Rango estimado: pH {colorResult.zone.phRange}
                          {colorResult.whiteBalanced ? ' • Luz ajustada' : ''}
                        </p>
                      </div>
                    </div>

                    {geminiEnabled && !visionLoading && (
                      <button
                        type="button"
                        onClick={() => runGeminiVision(compressedImg, colorResult)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF5F8] border border-[#E5BCCB] text-[11px] font-semibold text-[#8E1436] transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Volver a analizar
                      </button>
                    )}
                  </div>
                )}

                {/* Observación visual amigable */}
                {visionFeedback && (
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-1.5 fade-in-up ${
                      visionFeedback.validSample
                        ? 'bg-[#FFF5F8] border-[#F2C3D4] text-[#4E343D]'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold inline-flex items-center gap-1.5 text-[#8E1436]">
                        {visionFeedback.validSample ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        )}
                        {visionFeedback.validSample
                          ? `Lectura de tu muestra • pH aproximado ${visionFeedback.estimatedPh}`
                          : 'No pudimos distinguir bien la muestra de gel'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 border border-[#EBD2DC] text-[#556638]">
                        Privada • No se guarda
                      </span>
                    </div>
                    <p className="leading-relaxed">{visionFeedback.visualDescription}</p>
                    <p className="text-[11px] opacity-85">
                      <strong>Iluminación ({visionFeedback.lightingQuality}):</strong> {visionFeedback.lightingNote}
                    </p>
                    {visionFeedback.nextStepAdvice && (
                      <p className="text-[11px] font-medium text-[#7D3252] pt-1 border-t border-black/5">
                        {visionFeedback.nextStepAdvice}
                      </p>
                    )}
                  </div>
                )}

                {visionError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    {visionError}
                  </div>
                )}
              </div>
            )}

            {/* Comparador visual manual con los 4 tonos exactos de Flor de Jamaica */}
            <div className="space-y-2.5 pt-2 border-t border-[#F2E6EA]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5B454D]">
                  O selecciona manualmente el tono más parecido a tu prueba:
                </span>
                <span className="text-[11px] text-[#8A6D77]">
                  Tono basal: Fucsia brillante
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PH_ZONES.map((zone) => {
                  const active = triageInput.zoneId === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => handleManualZoneSelect(zone.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-2 ${
                        active
                          ? 'border-[#8E1436] bg-[#FFF5F8] ring-2 ring-[#8E1436]/20 shadow-xs'
                          : 'border-[#EFE2E6] bg-[#FDFBFA] hover:border-[#D98AA5]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, ${zone.primaryHex}, ${zone.secondaryHex})`,
                          }}
                        />
                        {active && (
                          <span className="w-5 h-5 rounded-full bg-[#8E1436] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#28161C] font-mono">
                          pH {zone.phRange}
                        </p>
                        <p className="text-[11px] text-[#6A4F59] leading-tight mt-0.5">
                          {zone.colorName.split('/')[0].trim()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TARJETA 2: PREGUNTAS RÁPIDAS LIMPIAS Y SIN RUIDO VISUAL */}
          {!discreetMode && (
            <div className="bg-white rounded-3xl border border-[#EFE2E6] p-5 sm:p-6 shadow-2xs space-y-5">
              <div>
                <h2 className="text-base font-semibold text-[#28161C]">
                  2. Contexto rápido (opcional)
                </h2>
                <p className="text-xs text-[#7A616A] mt-0.5">
                  Selecciona lo que coincida contigo hoy para afinar la orientación.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-[#F5ECEF]">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#4E3B42]">
                    Aspecto del flujo
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(FLOW_LABELS) as FlowOption[]).map((key) => {
                      const selected = triageInput.flow === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setJustInfoAck(false);
                            onUpdateTriage({ flow: key });
                          }}
                          className={`px-3 py-2 rounded-xl text-xs text-left font-medium border transition-all ${
                            selected
                              ? 'bg-[#FFF5F8] text-[#8E1436] border-[#8E1436] shadow-2xs'
                              : 'bg-[#FAF8F5]/70 text-[#5B454D] border-[#EFE4E8] hover:border-[#D9BAC5] hover:bg-white'
                          }`}
                        >
                          {FLOW_LABELS[key]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <p className="text-xs font-medium text-[#4E3B42]">
                    Olor o molestias <span className="font-normal text-[#9A818A]">(puedes marcar varios)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(SYMPTOM_LABELS) as SymptomOption[]).map((key) => {
                      const selected = triageInput.symptoms.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleSymptom(key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                            selected
                              ? 'bg-[#FFF5F8] text-[#8E1436] border-[#8E1436] shadow-2xs'
                              : 'bg-[#FAF8F5]/70 text-[#5B454D] border-[#EFE4E8] hover:border-[#D9BAC5] hover:bg-white'
                          }`}
                        >
                          {SYMPTOM_LABELS[key]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <p className="text-xs font-medium text-[#4E3B42]">
                    Etapa del ciclo
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(CYCLE_LABELS) as CycleOption[]).map((key) => {
                      const selected = triageInput.cycle === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setJustInfoAck(false);
                            onUpdateTriage({ cycle: key });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                            selected
                              ? 'bg-[#FFF5F8] text-[#8E1436] border-[#8E1436] shadow-2xs'
                              : 'bg-[#FAF8F5]/70 text-[#5B454D] border-[#EFE4E8] hover:border-[#D9BAC5] hover:bg-white'
                          }`}
                        >
                          {CYCLE_LABELS[key]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (5 cols): RESULTADO EMPÁTICO */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white rounded-3xl border border-[#EFE2E6] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-[#F2E6EA] pb-3.5">
              <span className="text-xs font-semibold text-[#7A616A]">
                {discreetMode ? 'Resultado' : 'Interpretación JamaKiss'}
              </span>
              <span className="text-xs font-semibold text-[#8E1436]">
                {assessment.priorityTag}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl border-2 border-white shadow-md shrink-0"
                  style={{
                    background: colorResult?.hex
                      ? colorResult.hex
                      : `linear-gradient(135deg, ${assessment.zone.primaryHex}, ${assessment.zone.secondaryHex})`,
                  }}
                />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#8A6D77]">pH Estimado</p>
                  <p className="text-2xl font-bold text-[#28161C] tracking-tight leading-none mt-0.5">
                    {assessment.zone.phRange}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-[#8A6D77]">Tono Jamaica</p>
                <p className="text-xs font-semibold text-[#8E1436] mt-0.5">
                  {assessment.zone.colorName.split('/')[0].trim()}
                </p>
              </div>
            </div>

            {/* Barra de espectro real de antocianinas */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-[#8A6D77] mb-1.5">
                <span>3.8</span>
                <span>4.5</span>
                <span>5.5</span>
                <span>6.5</span>
                <span>7.0+</span>
              </div>
              <div
                className="relative h-2.5 w-full rounded-full overflow-hidden border border-black/5"
                style={{
                  background:
                    'linear-gradient(90deg, #FF1A66 0%, #E6005C 25%, #7A003D 48%, #521466 72%, #2C4D5E 90%, #3B5948 100%)',
                }}
              >
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white border-2 border-[#28161C] rounded-full -translate-x-1/2 transition-all duration-500 shadow"
                  style={{ left: `${assessment.zone.positionPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#8A6D77] mt-1.5">
                <span>Ácido protector</span>
                <span>Alcalino / Alterado</span>
              </div>
            </div>

            {/* Contención emocional + Explicación */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF5F8] to-[#FAF8F5] border border-[#F2D5DF] space-y-2">
              <h3 className="text-sm font-bold text-[#5E0E26] leading-snug">
                {assessment.headline}
              </h3>
              <p className="text-xs font-medium text-[#8E1436] leading-relaxed">
                {assessment.calmReassurance}
              </p>
              <p className="text-xs text-[#5B454D] leading-relaxed">
                {assessment.clinicalExplanation}
              </p>
            </div>

            {/* Autocuidado */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#556638]">
                Autocuidado recomendado
              </p>
              <ul className="space-y-1.5 text-xs text-[#4E3B42]">
                {assessment.selfCareTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6B7D49] mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cierre amigable sin presión */}
            <div className="pt-4 border-t border-[#F2E6EA] space-y-2.5">
              <p className="text-xs text-[#5B454D]">
                {assessment.recommendCenters
                  ? 'Si deseas confirmar este resultado con una especialista, te muestro centros de atención confidencial cercanos:'
                  : '¿Cómo te gustaría continuar hoy?'}
              </p>

              <button
                type="button"
                onClick={onOpenCenters}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#8E1436] to-[#7D3252] hover:from-[#72112E] hover:to-[#652540] text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Ver centros cercanos (Huánuco / GPS)
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenScreeningSheet}
                  className="py-2.5 px-3 rounded-2xl bg-[#FCE8EF] hover:bg-[#F7D7E3] text-[#72112E] border border-[#F0C2D3] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Generar mi ficha
                </button>
                <button
                  type="button"
                  onClick={onOpenChatWithContext}
                  className="py-2.5 px-3 rounded-2xl bg-white hover:bg-[#FAF8F5] text-[#4E3B42] border border-[#E5D5DC] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <MessageCircleHeart className="w-3.5 h-3.5 text-[#A51942]" />
                  Hablar en el chat
                </button>
              </div>

              {!justInfoAck ? (
                <button
                  type="button"
                  onClick={() => setJustInfoAck(true)}
                  className="w-full py-1.5 text-[11px] font-medium text-[#8A6D77] hover:text-[#4E3B42] transition-colors"
                >
                  Solo quería informarme por hoy
                </button>
              ) : (
                <p className="text-center text-[11px] text-[#556638] bg-[#F2F5EC] border border-[#D4DFC1] rounded-xl py-2 px-3">
                  ¡Perfecto! Aquí estaremos cuando lo necesites, sin presiones ni juicios.
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 text-[10px] text-[#8A6D77] bg-[#FAF8F5] p-3 rounded-xl border border-[#EFE2E6]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#A51942]" />
              <span>
                Tamizaje preliminar orientativo. No sustituye diagnóstico médico/obstétrico ni detecta ITS que no alteran el pH de inmediato (VPH, herpes o clamidia inicial).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
