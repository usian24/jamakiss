import React from 'react';
import { X, Printer, Download, ShieldCheck, Calendar, Palette, Stethoscope } from 'lucide-react';
import {
  ClinicalAssessment,
  CYCLE_LABELS,
  FLOW_LABELS,
  SYMPTOM_LABELS,
  TriageInput,
} from '../engine/clinicalTriage';
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  const swatchColor = colorResult?.hex || assessment.zone.primaryHex;
  const symptomsText = triageInput.symptoms.map((s) => SYMPTOM_LABELS[s]).join(', ');

  /**
   * Genera un documento A4 de UNA SOLA PÁGINA exacto y limpio mediante iframe aislado,
   * evitando por completo que el resto de la app rompa el PDF en 2–3 páginas descuadradas.
   */
  const handlePrintCleanPdf = () => {
    const logoAbsoluteUrl = `${window.location.origin}/jamakiss-logo.jpg`;

    const tipsHtml = PRE_APPOINTMENT_TIPS.map(
      (tip) =>
        `<li><strong>${escapeHtml(tip.title)}:</strong> ${escapeHtml(tip.detail)}</li>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Ficha de Tamizaje JamaKiss - ${escapeHtml(formattedDate)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Arial, sans-serif;
      color: #28161C;
      background: #FFFFFF;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .sheet {
      width: 100%;
      max-width: 186mm;
      margin: 0 auto;
      border: 1.5px solid #EBD8DF;
      border-radius: 14px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 16px 20px;
      background: #FAF8F5;
      border-bottom: 1.5px solid #EFE2E6;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo {
      height: 46px;
      width: auto;
      object-fit: contain;
    }
    .title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #5E0E26;
    }
    .subtitle {
      margin: 2px 0 0;
      font-size: 11px;
      color: #6A4F59;
    }
    .meta-box {
      text-align: right;
      font-size: 10.5px;
      color: #6A4F59;
    }
    .meta-anon {
      display: inline-block;
      margin-top: 3px;
      color: #556638;
      font-weight: 600;
    }
    .body {
      padding: 18px 20px;
    }
    .center-banner {
      background: #FFF5F8;
      border: 1px solid #F0C6D5;
      border-radius: 10px;
      padding: 9px 12px;
      margin-bottom: 14px;
      font-size: 11px;
      color: #5E0E26;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .card {
      border: 1px solid #ECE0E4;
      border-radius: 11px;
      padding: 12px 14px;
      background: #FFFFFF;
    }
    .card-kicker {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #8A6D77;
      margin: 0 0 8px;
    }
    .ph-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .swatch {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      flex-shrink: 0;
    }
    .ph-val {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #28161C;
      line-height: 1.15;
    }
    .ph-color {
      margin: 2px 0 0;
      font-size: 11px;
      color: #6A4F59;
    }
    .priority-tag {
      margin: 0 0 4px;
      font-size: 11px;
      font-weight: 700;
      color: #8E1436;
    }
    .headline {
      margin: 0;
      font-size: 12.5px;
      font-weight: 700;
      color: #28161C;
      line-height: 1.3;
    }
    .section {
      background: #FAF8F5;
      border: 1px solid #ECE0E4;
      border-radius: 11px;
      padding: 13px 15px;
      margin-bottom: 14px;
    }
    .section-title {
      margin: 0 0 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #8E1436;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .field-label {
      font-size: 9.5px;
      color: #8A6D77;
      margin: 0;
    }
    .field-value {
      font-size: 11px;
      font-weight: 600;
      color: #28161C;
      margin: 2px 0 0;
    }
    .clinical-note {
      margin: 0;
      padding-top: 9px;
      border-top: 1px solid #E7DCE0;
      font-size: 11px;
      color: #4E3B42;
    }
    .tips {
      background: #FFF7FA;
      border: 1px solid #F2D2DE;
      border-radius: 11px;
      padding: 12px 15px;
      margin-bottom: 14px;
    }
    .tips-title {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 700;
      color: #5E0E26;
    }
    .tips ul {
      margin: 0;
      padding-left: 16px;
      font-size: 10.5px;
      color: #4E3B42;
    }
    .tips li {
      margin-bottom: 4px;
    }
    .tips li:last-child {
      margin-bottom: 0;
    }
    .disclaimer {
      font-size: 9.5px;
      color: #7A616A;
      border-top: 1px solid #EFE2E6;
      padding-top: 10px;
      margin: 0;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="header-left">
        <img class="logo" src="${logoAbsoluteUrl}" alt="JamaKiss" />
        <div>
          <h1 class="title">Ficha de Tamizaje Obstétrico</h1>
          <p class="subtitle">Resumen anónimo orientativo para mostrar en consulta</p>
        </div>
      </div>
      <div class="meta-box">
        <div>${escapeHtml(formattedDate)} · ${escapeHtml(formattedTime)}</div>
        <div class="meta-anon">Ficha anónima (sin datos personales)</div>
      </div>
    </div>

    <div class="body">
      ${
        selectedCenterName
          ? `<div class="center-banner"><strong>Establecimiento seleccionado:</strong> ${escapeHtml(selectedCenterName)}</div>`
          : ''
      }

      <div class="grid-2">
        <div class="card">
          <p class="card-kicker">Lectura Colorimétrica JamaKiss (in vitro)</p>
          <div class="ph-row">
            <div class="swatch" style="background-color: ${escapeHtml(swatchColor)};"></div>
            <div>
              <p class="ph-val">pH ${escapeHtml(assessment.zone.phRange)}</p>
              <p class="ph-color">${escapeHtml(assessment.zone.colorName)}</p>
            </div>
          </div>
        </div>

        <div class="card">
          <p class="card-kicker">Orientación Preliminar</p>
          <p class="priority-tag">${escapeHtml(assessment.priorityTag)}</p>
          <p class="headline">${escapeHtml(assessment.headline)}</p>
        </div>
      </div>

      <div class="section">
        <p class="section-title">Datos de referencia para la obstetra / médica</p>
        <div class="grid-3">
          <div>
            <p class="field-label">Aspecto del flujo</p>
            <p class="field-value">${escapeHtml(FLOW_LABELS[triageInput.flow])}</p>
          </div>
          <div>
            <p class="field-label">Etapa del ciclo</p>
            <p class="field-value">${escapeHtml(CYCLE_LABELS[triageInput.cycle])}</p>
          </div>
          <div>
            <p class="field-label">Olor / Molestias</p>
            <p class="field-value">${escapeHtml(symptomsText)}</p>
          </div>
        </div>
        <p class="clinical-note">${escapeHtml(assessment.clinicalExplanation)}</p>
      </div>

      <div class="tips">
        <p class="tips-title">Recomendaciones previas a la consulta</p>
        <ul>${tipsHtml}</ul>
      </div>

      <p class="disclaimer">
        <strong>Aviso clínico:</strong> JamaKiss es una herramienta visual orientativa de tamizaje preliminar de pH vaginal basada en antocianinas de flor de Jamaica (<em>Hibiscus sabdariffa</em>) en prueba externa <em>in vitro</em>. No sustituye un diagnóstico médico, obstétrico ni exámenes microbiológicos (examen en fresco o cultivo), y no detecta ITS que no alteren el pH de forma inmediata (como VPH, herpes o clamidia inicial).
      </p>
    </div>
  </div>
</body>
</html>`;

    // Crear un iframe oculto aislado para imprimir exactamente 1 página A4 sin el fondo de la web
    const existing = document.getElementById('jamakiss-print-frame');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'jamakiss-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc || !iframe.contentWindow) {
      window.print();
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const triggerPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 2000);
    };

    const img = frameDoc.querySelector('img');
    if (img && !img.complete) {
      img.onload = triggerPrint;
      img.onerror = triggerPrint;
    } else {
      window.setTimeout(triggerPrint, 180);
    }
  };

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
        ? '   - Método: Lectura fotográfica sobre muestra externa (in vitro)'
        : '   - Método: Comparación visual con escala de flor de Jamaica',
      '',
      '2. CONTEXTO Y SÍNTOMAS REPORTADOS',
      `   - Aspecto del flujo: ${FLOW_LABELS[triageInput.flow]}`,
      `   - Olor / Molestias: ${symptomsText}`,
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
        <div className="px-6 py-5 bg-gradient-to-r from-[#FAF8F5] via-[#FFF5F8] to-white border-b border-[#EFE2E6] flex items-center justify-between shrink-0">
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

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Metadatos */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B5A62] bg-[#FAF7F8] px-4 py-2.5 rounded-xl border border-[#EFE6EA]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8E1436]" />
              {formattedDate} • {formattedTime}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#556638]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sin datos personales (Anónima)
            </span>
          </div>

          {selectedCenterName && (
            <div className="text-xs bg-[#FFF5F8] border border-[#F0C6D5] rounded-xl px-4 py-2.5 text-[#5E0E26]">
              <span className="font-semibold">Establecimiento seleccionado:</span> {selectedCenterName}
            </div>
          )}

          {/* Bloque colorimétrico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-[#EFE6EA] bg-white">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8C737E]">
                <Palette className="w-3.5 h-3.5 text-[#8E1436]" />
                Lectura de pH JamaKiss
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl shadow-inner border border-black/10 shrink-0"
                  style={{ backgroundColor: swatchColor }}
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
                <Stethoscope className="w-3.5 h-3.5 text-[#8E1436]" />
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
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFE6EA] space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E1436]">
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
                <dd className="font-medium text-[#1A1619] mt-0.5">{symptomsText}</dd>
              </div>
            </dl>
            <p className="text-xs text-[#594A51] pt-2 border-t border-[#EAE0E4] leading-relaxed">
              {assessment.clinicalExplanation}
            </p>
          </div>

          {/* Recordatorio breve antes de consulta */}
          <div className="p-4 rounded-2xl bg-[#FFF7FA] border border-[#F2D2DE] space-y-1.5">
            <p className="text-xs font-semibold text-[#5E0E26]">
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
        <div className="no-print px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 bg-[#FAF8F5] border-t border-[#EFE6EA] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={handleDownloadText}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl border border-[#DFCED6] bg-white hover:bg-[#FFF5F8] text-xs font-medium text-[#4A3B42] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar resumen (.txt)
          </button>
          <button
            onClick={handlePrintCleanPdf}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-[#8E1436] hover:bg-[#72112E] text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / Guardar PDF (1 hoja)
          </button>
        </div>
      </div>
    </div>
  );
};
