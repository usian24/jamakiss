import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FileText,
  Lock,
  MapPin,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildLocalEmpatheticReply,
  ClinicalAssessment,
  CYCLE_LABELS,
  FLOW_LABELS,
  SYMPTOM_LABELS,
  TriageInput,
} from '../engine/clinicalTriage';
import {
  CompressedImagePayload,
  compressImageForVision,
} from '../engine/imageCompressor';

export interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  imageThumb?: string;
  source?: 'gemini' | 'local';
  showActions?: boolean;
}

interface AssistantDrawerProps {
  isOpen: boolean;
  discreetMode: boolean;
  geminiEnabled: boolean;
  assessment: ClinicalAssessment;
  triageInput: TriageInput;
  pendingPrompt: string | null;
  onClearPendingPrompt: () => void;
  onThinkingChange: (thinking: boolean) => void;
  onClose: () => void;
  onOpenCenters: () => void;
  onOpenScreeningSheet: () => void;
}

const QUICK_CHIPS = [
  '¿Por qué sigue fucsia si tengo picazón?',
  '¿Es grave que salga morado?',
  '¿Dónde atenderme en Huánuco con SIS?',
  '¿Cómo influye el semen o mi periodo?',
  '¿Cómo uso el prototipo seguro?',
];

function renderFormattedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  discreetMode,
  geminiEnabled,
  assessment,
  triageInput,
  pendingPrompt,
  onClearPendingPrompt,
  onThinkingChange,
  onClose,
  onOpenCenters,
  onOpenScreeningSheet,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hola, bienvenida a JamaKiss. Este es un espacio seguro, privado y libre de juicios. Tus fotos y respuestas son confidenciales y no se comparten con nadie.\n\nPuedes escribirme tu duda, tocar un botón rápido o subir directamente la foto de tu prueba con el ícono de cámara.',
      source: 'local',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [attachedImg, setAttachedImg] = useState<CompressedImagePayload | null>(null);
  const [isSending, setIsSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const chatFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Evitar scroll de fondo en celular cuando el chat ocupa toda la pantalla
  useEffect(() => {
    if (!isOpen) return;
    const isMobile = window.innerWidth < 640;
    if (!isMobile) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const handleAttachPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = await compressImageForVision(file, 512, 0.72);
      setAttachedImg(payload);
    } catch {
      // Ignorar si no es imagen válida
    } finally {
      if (chatFileRef.current) chatFileRef.current.value = '';
    }
  };

  const sendMessage = async (text: string, photoPayload: CompressedImagePayload | null = attachedImg) => {
    const trimmed = text.trim();
    if ((!trimmed && !photoPayload) || isSending) return;

    const displayText =
      trimmed || 'Subí esta foto de mi prueba JamaKiss. ¿Qué tono y rango de pH observas?';

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: displayText,
      imageThumb: photoPayload?.dataUrl,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputValue('');
    setAttachedImg(null);
    setIsSending(true);
    onThinkingChange(true);

    const clinicalContext = {
      phRange: assessment.zone.phRange,
      colorName: assessment.zone.colorName,
      headline: assessment.headline,
      flow: FLOW_LABELS[triageInput.flow],
      symptoms: triageInput.symptoms.map((s) => SYMPTOM_LABELS[s]),
      cycle: CYCLE_LABELS[triageInput.cycle],
    };

    let replyText = '';
    let source: 'gemini' | 'local' = 'local';

    if (geminiEnabled) {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: displayText,
            history: nextHistory.slice(-8).map((m) => ({ sender: m.sender, text: m.text })),
            clinicalContext,
            imageBase64: photoPayload?.base64 || null,
            mimeType: photoPayload?.mimeType || 'image/jpeg',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            replyText = data.reply;
            source = 'gemini';
          }
        }
      } catch {
        // Fallback local si el servidor no responde
      }
    }

    if (!replyText) {
      await new Promise((r) => setTimeout(r, 380));
      replyText = buildLocalEmpatheticReply(displayText, assessment);
      source = 'local';
    }

    const suggestAction =
      assessment.recommendCenters ||
      /centro|clinica|clínica|morado|vino|azul|picaz|candid|embaraz|consulta|evalua|huánuco|huanuco|sis/i.test(
        displayText + ' ' + replyText
      );

    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        source,
        showActions: suggestAction,
      },
    ]);
    setIsSending(false);
    onThinkingChange(false);
  };

  useEffect(() => {
    if (isOpen && pendingPrompt) {
      sendMessage(pendingPrompt, null);
      onClearPendingPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pendingPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue, attachedImg);
  };

  return (
    <div
      className={`fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-50 w-full h-[100dvh] sm:w-[410px] sm:h-[580px] sm:max-h-[80vh] bg-white sm:bg-white/98 sm:backdrop-blur-2xl rounded-none sm:rounded-3xl border-0 sm:border sm:border-[#EED9E0] shadow-none sm:shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isOpen
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-6 sm:scale-95 pointer-events-none'
      }`}
    >
      {/* Cabecera limpia con safe-area para celular */}
      <div className="px-4 py-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] sm:pt-3.5 bg-[#FAF8F5] border-b border-[#EFE2E6] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white border border-[#EFE2E6] flex items-center justify-center overflow-hidden p-0.5">
            <img
              src="/jamakiss-logo.jpg"
              alt="JamaKiss"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-sm sm:text-xs font-semibold text-[#28161C] flex items-center gap-1.5">
              {discreetMode ? 'Asistente de Bienestar' : 'Consejera JamaKiss'}
              <span className="text-[10px] font-normal text-[#556638] inline-flex items-center gap-1">
                · <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> En línea
              </span>
            </h3>
            <p className="text-[11px] sm:text-[10px] text-[#7A616A] flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-[#7A616A]" />
              Privado y anónimo · Las fotos no se guardan
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full text-[#6A4F59] hover:bg-white transition-colors"
          aria-label="Cerrar asistente"
        >
          <X className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Área de mensajes */}
      <div ref={listRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FAF8F5]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            } fade-in-up`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-br from-[#8E1436] to-[#7D3252] text-white rounded-tr-xs shadow-xs'
                  : 'bg-white text-[#28161C] border border-[#EFE2E6] rounded-tl-xs shadow-2xs'
              }`}
            >
              {msg.imageThumb && (
                <div className="mb-2 space-y-1">
                  <img
                    src={msg.imageThumb}
                    alt="Muestra adjunta"
                    className="max-h-32 rounded-xl border border-white/25 object-contain"
                  />
                  <span className="inline-block text-[9px] bg-white/15 px-1.5 py-0.5 rounded">
                    Foto privada • eliminada tras lectura
                  </span>
                </div>
              )}
              {renderFormattedText(msg.text)}
            </div>

            {msg.sender === 'assistant' && msg.showActions && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%]">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCenters();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FCE8EF] hover:bg-[#F7D7E3] text-[#72112E] border border-[#F0C2D3] text-[11px] font-semibold transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  Ver centros en Huánuco
                </button>
                <button
                  type="button"
                  onClick={onOpenScreeningSheet}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#FAF8F5] text-[#4E3B42] border border-[#E5D5DC] text-[11px] font-semibold transition-colors"
                >
                  <FileText className="w-3 h-3 text-[#8E1436]" />
                  Generar mi ficha
                </button>
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-[#8E1436] bg-white border border-[#EFE2E6] px-3 py-2 rounded-2xl w-fit">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Analizando y escribiendo con empatía...
          </div>
        )}
      </div>

      {/* Chips rápidos */}
      <div className="px-3 py-2 bg-white border-t border-[#F2E6EA] flex gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => sendMessage(chip, null)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-[#FCE8EF] border border-[#E7D8DE] hover:border-[#D98AA5] text-[11px] text-[#5B454D] hover:text-[#72112E] transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Previsualización de foto adjunta comprimida */}
      {attachedImg && (
        <div className="px-3 py-2 bg-[#FFF5F8] border-t border-[#F2D5DF] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img
              src={attachedImg.dataUrl}
              alt="Vista previa"
              className="w-9 h-9 rounded-lg object-cover border border-[#E8C5D3]"
            />
            <div className="text-[11px]">
              <p className="font-semibold text-[#72112E]">Foto lista para enviar</p>
              <p className="text-[10px] text-[#556638]">
                Confidencial • se eliminará al responderte
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAttachedImg(null)}
            className="p-1.5 text-[#8E1436] hover:bg-white rounded-lg"
            aria-label="Quitar imagen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de entrada con botón de cámara + envío (16px en móvil evita zoom en iOS) */}
      <form
        onSubmit={handleSubmit}
        className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 bg-white border-t border-[#EFE2E6] flex items-center gap-2 shrink-0"
      >
        <input
          ref={chatFileRef}
          type="file"
          accept="image/*"
          onChange={handleAttachPhoto}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => chatFileRef.current?.click()}
          title="Subir foto de tu prueba JamaKiss al chat"
          className="p-2.5 sm:p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#FCE8EF] border border-[#E5D5DC] text-[#7D3252] hover:text-[#8E1436] transition-colors shrink-0"
        >
          <Camera className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Escribe tu duda o adjunta tu foto..."
          className="flex-1 bg-[#FAF8F5] border border-[#E5D5DC] focus:border-[#A51942] focus:bg-white rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-base sm:text-xs text-[#28161C] outline-none transition-all placeholder:text-[#9A7F89]"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isSending || (!inputValue.trim() && !attachedImg)}
          className="bg-[#8E1436] hover:bg-[#72112E] disabled:opacity-50 text-white rounded-xl px-4 py-2.5 sm:px-3.5 sm:py-2 text-xs font-semibold transition-colors inline-flex items-center gap-1 shrink-0"
        >
          <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
      </form>
    </div>
  );
};
