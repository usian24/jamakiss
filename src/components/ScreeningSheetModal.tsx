import React from 'react';
import { X, Printer, Download, ShieldCheck, Calendar, Palette, Stethoscope } from 'lucide-react';
import { ClinicalAssessment, CYCLE_LABELS, FLOW_LABELS, SYMPTOM_LABELS, TriageInput } from '../engine/clinicalTriage';
import { ColorimetryResult } from '../engine/colorimetry';
import { PRE_APPOINTMENT_TIPS } from '../data/jamakissData';

interface ScreeningSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: ClinicalAssessment;
  triageInput: TriageInput;
  colorResult: ColorimetryResult | null;
  selectedCenterName?: string;
}

export const ScreeningSheetModal: React.FC<ScreeningSheetModalProps> = ({
  isOpen,
  onClose,
  assessment,
  triageInput,
  colorResult,
  selectedCenterName,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const formattedDate = now.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDownloadText = () => {
    const lines = [
      '====================================================',
      '        FICHA DE TAMIZAJE ORIENTATIVO JAMAKISS',
      '====================================================',
      `Fecha y hora: ${formattedDate} - ${formattedTime}`,
      selectedCenterName ? `Centro seleccionado: ${selectedCenterName}` : '',
      '',
      '1. RESULTADO COLORIMÉTRICO (IN VITRO)',
      `   - Rango de pH estimado: ${assessment.zone.phRange}`,
      `   - Tono observado en gel: ${assessment.zone.colorName}`,
      colorResult
        ? `   - Método: Lectura fotográfica sobre muestra externa (in vitro)`
        : '   - Método: Comparación visual con escala de flor de Jamaica',
      '',
      '2. CONTEXTO Y SÍNTOMAS REPORTADOS',
      `   - Aspecto del flujo: ${FLOW_LABELS[triageInput.flow]}`,
      `   - Olor / Molestias: ${triageInput.symptoms.map((s) => SYMPTOM_LABELS[s]).join(', ')}`,
      `   - Etapa del ciclo / Contexto: ${CYCLE_LABELS[triageInput.cycle]}`,
      '',
      '3. ORIENTACIÓN PRELIMINAR',
      `   - Clasificación: ${assessment.headline}`,
      `   - Detalle: ${assessment.clinicalExplanation}`,
      '',
      'NOTA CLÍNICA:',
      'JamaKiss es una herramienta de tamizaje preliminar visual de pH vaginal basada en antocianinas',
      'de Hibiscus sabdariffa (prueba externa in vitro). No sustituye el diagnóstico médico/obstétrico',
      'ni exámenes microbiológicos (examen en fresco o cultivo).',
    ].filter(Boolean);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ficha-Tamizaje-JamaKiss-${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-0 sm:p-6 overflow-y-auto">
      <div
        id="screening-sheet-printable"
        className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl border border-[#F0DDE5] shadow-2xl overflow-hidden sm:my-auto max-h-[92dvh] flex flex-col fade-in-up"
      >
        {/* Cabecera limpia y profesional */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#FAF8F5] via-[#FFF5F8] to-white border-b border-[#EFE2E6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/jamakiss-logo.jpg"
              alt="JamaKiss"
              className="h-12 w-auto object-contain logo-blend"
            />
            <div>
              <h2 className="font-brand text-base sm:text-lg font-bold text-[#5E0E26] tracking-tight">
                Ficha de Tamizaje Obstétrico
              </h2>
              <p className="text-[11px] text-[#6A4F59]">
                Resumen anónimo para mostrar en consulta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="no-print p-2 rounded-full text-[#7D6670] hover:bg-[#FFF0F5] hover:text-[#720E36] transition-colors"
            aria-label="Cerrar ficha"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Metadatos */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B5A62] bg-[#FAF7F8] px-4 py-2.5 rounded-xl border border-[#EFE6EA]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#B31353]" />
              {formattedDate} • {formattedTime}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sin datos personales (Anónima)
            </span>
          </div>

          {selectedCenterName && (
            <div className="text-xs bg-[#FFF5F8] border border-[#F8C2D7] rounded-xl px-4 py-2.5 text-[#720E36]">
              <span className="font-semibold">Establecimiento seleccionado:</span> {selectedCenterName}
            </div>
          )}

          {/* Bloque colorimétrico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-[#EFE6EA] bg-white">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8C737E]">
                <Palette className="w-3.5 h-3.5 text-[#B31353]" />
                Lectura de pH JamaKiss
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl shadow-inner border border-black/10 shrink-0"
                  style={{
                    backgroundColor: colorResult?.hex || assessment.zone.primaryHex,
                  }}
                />
                <div>
                  <p className="text-lg font-bold text-[#1A1619] leading-tight">
                    pH {assessment.zone.phRange}
                  </p>
                  <p className="text-xs text-[#6B5A62]">{assessment.zone.colorName}</p>
                </div>
              </div>
              {colorResult && (
                <p className="mt-2 text-[11px] text-[#8C737E]">
                  Lectura asistida sobre muestra externa (in vitro)
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl border border-[#EFE6EA] bg-white">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8C737E]">
                <Stethoscope className="w-3.5 h-3.5 text-[#B31353]" />
                Orientación preliminar
              </div>
              <p className="mt-2 text-[11px] font-semibold text-[#8E1436]">
                {assessment.priorityTag}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#1A1619]">
                {assessment.headline}
              </p>
            </div>
          </div>

          {/* Síntomas reportados */}
          <div className="p-4 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA] space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#720E36]">
              Datos de referencia para la obstetra / médica
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <dt className="text-[11px] text-[#8C737E]">Aspecto del flujo</dt>
                <dd className="font-medium text-[#1A1619] mt-0.5">{FLOW_LABELS[triageInput.flow]}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#8C737E]">Etapa del ciclo</dt>
                <dd className="font-medium text-[#1A1619] mt-0.5">{CYCLE_LABELS[triageInput.cycle]}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#8C737E]">Olor / Molestias</dt>
                <dd className="font-medium text-[#1A1619] mt-0.5">
                  {triageInput.symptoms.map((s) => SYMPTOM_LABELS[s]).join(', ')}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-[#594A51] pt-2 border-t border-[#EAE0E4] leading-relaxed">
              {assessment.clinicalExplanation}
            </p>
          </div>

          {/* Recordatorio breve antes de consulta */}
          <div className="p-4 rounded-2xl bg-[#FFF7FA] border border-[#F8D6E4] space-y-1.5">
            <p className="text-xs font-semibold text-[#720E36]">
              Recuerda antes de acudir a tu cita:
            </p>
            <ul className="text-[11px] text-[#5E4952] space-y-1 list-disc pl-4">
              {PRE_APPOINTMENT_TIPS.map((tip) => (
                <li key={tip.title}>
                  <span className="font-medium">{tip.title}:</span> {tip.detail}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[10px] text-[#8C737E] leading-relaxed">
            <strong>Aviso clínico:</strong> JamaKiss es una herramienta visual orientativa de tamizaje de pH vaginal (prueba externa <em>in vitro</em> con extracto de <em>Hibiscus sabdariffa</em>). No sustituye un diagnóstico médico, obstétrico ni un examen microbiológico (examen en fresco o cultivo), y no detecta ITS que no alteren el pH de forma inmediata (como VPH, herpes o clamidia inicial).
          </p>
        </div>

        {/* Acciones */}
        <div className="no-print px-6 py-4 bg-[#FAF7F8] border-t border-[#EFE6EA] flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={handleDownloadText}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DFCED6] bg-white hover:bg-[#FFF5F8] text-xs font-medium text-[#4A3B42] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar resumen (.txt)
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8D0F42] hover:bg-[#720E36] text-xs font-medium text-white shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

