import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Eye, EyeOff, FlaskConical, MapPin, MessageCircleHeart, ShieldCheck } from 'lucide-react';
import { AnalyzerModule } from './components/AnalyzerModule';
import { HealthCentersModule } from './components/HealthCentersModule';
import { GuideAndTechModule } from './components/GuideAndTechModule';
import { JamaKissOrb } from './components/JamaKissOrb';
import { AssistantDrawer } from './components/AssistantDrawer';
import { ScreeningSheetModal } from './components/ScreeningSheetModal';
import { ColorimetryResult } from './engine/colorimetry';
import {
  CYCLE_LABELS,
  evaluateClinicalTriage,
  FLOW_LABELS,
  SYMPTOM_LABELS,
  TriageInput,
} from './engine/clinicalTriage';

type ActiveTab = 'analyzer' | 'centers' | 'guide';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyzer');
  const [discreetMode, setDiscreetMode] = useState(false);
  const [geminiEnabled, setGeminiEnabled] = useState(false);

  const [triageInput, setTriageInput] = useState<TriageInput>({
    zoneId: 'normal',
    flow: 'normal',
    symptoms: ['sin_molestias'],
    cycle: 'ninguno',
  });
  const [colorResult, setColorResult] = useState<ColorimetryResult | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetCenterName, setSheetCenterName] = useState<string | undefined>(undefined);

  // Verificar si el servidor API tiene Gemini configurado
  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.geminiEnabled) {
          setGeminiEnabled(true);
        }
      })
      .catch(() => {
        // Modo 100% local en navegador
      });
    return () => {
      active = false;
    };
  }, []);

  const assessment = useMemo(() => evaluateClinicalTriage(triageInput), [triageInput]);

  const handleUpdateTriage = (patch: Partial<TriageInput>) => {
    setTriageInput((prev) => ({ ...prev, ...patch }));
  };

  const handleOpenScreeningSheet = (centerName?: string) => {
    setSheetCenterName(centerName);
    setIsSheetOpen(true);
  };

  const handleOpenChatWithContext = () => {
    const prompt = `Mi prueba JamaKiss marcó tono "${assessment.zone.colorName}" (pH ${assessment.zone.phRange}). Flujo: ${FLOW_LABELS[triageInput.flow]}. Síntomas: ${triageInput.symptoms
      .map((s) => SYMPTOM_LABELS[s])
      .join(', ')}. Contexto: ${CYCLE_LABELS[triageInput.cycle]}. ¿Qué me recomiendas tener en cuenta?`;
    setPendingPrompt(prompt);
    setIsDrawerOpen(true);
  };

  const navigateTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#28161C]">
      {/* Barra superior armonizada (en celular queda súper limpia: solo logo + modo discreto) */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/94 backdrop-blur-xl border-b border-[#ECE0E4] pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Identidad (el logo siempre se muestra normal) */}
          <button
            type="button"
            onClick={() => navigateTab('analyzer')}
            className="flex items-center gap-2.5 text-left focus:outline-none shrink-0"
          >
            <img
              src="/jamakiss-logo.jpg"
              alt="JamaKiss - Gel Íntimo Bienestar Natural"
              className="h-9 sm:h-11 w-auto object-contain logo-blend"
            />
            {!discreetMode && (
              <div className="hidden md:block pl-2.5 border-l border-[#E6D6DC]">
                <span className="text-xs font-semibold text-[#8E1436] block leading-tight">
                  Bienestar Natural
                </span>
                <span className="text-[10px] text-[#7A616A]">
                  Orientación Preventiva • Huánuco
                </span>
              </div>
            )}
          </button>

          {/* Navegación superior solo en tablet/PC (en celular va abajo estilo app móvil) */}
          <nav className="hidden sm:flex items-center p-1 bg-white rounded-full border border-[#EAE0E3] shadow-2xs">
            <button
              type="button"
              onClick={() => navigateTab('analyzer')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'analyzer'
                  ? 'bg-[#8E1436] text-white shadow-xs'
                  : 'text-[#6A4F59] hover:text-[#28161C]'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{discreetMode ? 'Inicio' : 'Analizador'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTab('centers')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'centers'
                  ? 'bg-[#8E1436] text-white shadow-xs'
                  : 'text-[#6A4F59] hover:text-[#28161C]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{discreetMode ? 'Mapa' : 'Centros Cercanos'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTab('guide')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-[#8E1436] text-white shadow-xs'
                  : 'text-[#6A4F59] hover:text-[#28161C]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{discreetMode ? 'Guía' : 'Guía y Ciencia'}</span>
            </button>
          </nav>

          {/* Toggle sutil de Modo Discreto (oculta textos sensibles manteniendo el logo) */}
          <button
            type="button"
            onClick={() => setDiscreetMode((v) => !v)}
            title={
              discreetMode
                ? 'Modo discreto activo: oculta textos llamativos o sensibles'
                : 'Activar modo discreto para ocultar textos llamativos en pantalla'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors shrink-0 ${
              discreetMode
                ? 'bg-[#28161C] text-white border-[#28161C]'
                : 'bg-white text-[#6A4F59] border-[#EAE0E3] hover:border-[#C89AA9]'
            }`}
          >
            {discreetMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{discreetMode ? 'Discreto' : 'Modo discreto'}</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-8">
        {activeTab === 'analyzer' && (
          <AnalyzerModule
            discreetMode={discreetMode}
            triageInput={triageInput}
            assessment={assessment}
            colorResult={colorResult}
            geminiEnabled={geminiEnabled}
            onUpdateTriage={handleUpdateTriage}
            onColorResultChange={setColorResult}
            onOpenCenters={() => navigateTab('centers')}
            onOpenScreeningSheet={() => handleOpenScreeningSheet()}
            onOpenChatWithContext={handleOpenChatWithContext}
          />
        )}

        {activeTab === 'centers' && (
          <HealthCentersModule
            discreetMode={discreetMode}
            onToggleDiscreetMode={() => setDiscreetMode((v) => !v)}
            onOpenScreeningSheet={handleOpenScreeningSheet}
          />
        )}

        {activeTab === 'guide' && <GuideAndTechModule discreetMode={discreetMode} />}
      </main>

      {/* Footer (oculto en celular para no estorbar la barra inferior tipo app) */}
      <footer className="hidden sm:block bg-white border-t border-[#EFE3E8] py-5 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8C737E]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#8E1436]" />
            <span>
              {discreetMode ? (
                <>
                  <strong>JamaKiss</strong> • Bienestar Natural
                </>
              ) : (
                <>
                  <strong>JamaKiss</strong> • Gel bioindicador natural con <em>Hibiscus sabdariffa</em> y mucílago de linaza
                </>
              )}
            </span>
          </div>
          <span className="text-[11px]">
            {discreetMode ? 'Privado · Huánuco, Perú' : 'Tamizaje preliminar preventivo · Sin almacenamiento de fotos · Huánuco, Perú'}
          </span>
        </div>
      </footer>

      {/* Barra de Navegación Inferior estilo App Nativa en Celulares */}
      <nav
        aria-label="Navegación móvil"
        className={`sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-[#ECE0E4] pb-[env(safe-area-inset-bottom)] ${
          isDrawerOpen ? 'hidden' : 'block'
        }`}
      >
        <div className="grid grid-cols-4 h-16">
          <button
            type="button"
            onClick={() => navigateTab('analyzer')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'analyzer' ? 'text-[#8E1436]' : 'text-[#7A616A]'
            }`}
          >
            <FlaskConical className="w-5 h-5" />
            <span>{discreetMode ? 'Inicio' : 'Analizador'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab('centers')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'centers' ? 'text-[#8E1436]' : 'text-[#7A616A]'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>{discreetMode ? 'Mapa' : 'Centros'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab('guide')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'guide' ? 'text-[#8E1436]' : 'text-[#7A616A]'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Guía</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-[#8E1436]"
          >
            <MessageCircleHeart className="w-5 h-5" />
            <span>Chat</span>
          </button>
        </div>
      </nav>

      {/* Orbe 3D Flotante (encima de la barra móvil y oculto cuando el chat está abierto en celular) */}
      <aside className={`fixed bottom-20 right-4 sm:bottom-5 sm:right-5 z-40 ${isDrawerOpen ? 'hidden sm:block' : 'block'}`}>
        <JamaKissOrb
          zoneId={triageInput.zoneId}
          isOpen={isDrawerOpen}
          isThinking={isAssistantThinking}
          onClick={() => setIsDrawerOpen((v) => !v)}
        />
      </aside>

      <AssistantDrawer
        isOpen={isDrawerOpen}
        discreetMode={discreetMode}
        geminiEnabled={geminiEnabled}
        assessment={assessment}
        triageInput={triageInput}
        pendingPrompt={pendingPrompt}
        onClearPendingPrompt={() => setPendingPrompt(null)}
        onThinkingChange={setIsAssistantThinking}
        onClose={() => setIsDrawerOpen(false)}
        onOpenCenters={() => navigateTab('centers')}
        onOpenScreeningSheet={() => handleOpenScreeningSheet()}
      />

      {/* Modal: Ficha de Tamizaje JamaKiss */}
      <ScreeningSheetModal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        assessment={assessment}
        triageInput={triageInput}
        colorResult={colorResult}
        selectedCenterName={sheetCenterName}
      />
    </div>
  );
}

export default App;

