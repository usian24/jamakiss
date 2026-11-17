import React, { useState } from 'react';
import {
  AlertTriangle,
  Beaker,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  HelpCircle,
  Info,
  ShieldAlert,
  Sparkles,
  ThermometerSnowflake,
} from 'lucide-react';
import { FLOW_GLOSSARY, MYTH_CARDS, PH_ZONES } from '../data/jamakissData';

interface GuideAndTechModuleProps {
  discreetMode?: boolean;
}

export const GuideAndTechModule: React.FC<GuideAndTechModuleProps> = ({ discreetMode = false }) => {
  const [revealedIds, setRevealedIds] = useState<string[]>([MYTH_CARDS[0].id]);

  const toggleMyth = (id: string) => {
    setRevealedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 fade-in-up">
      {/* Encabezado limpio */}
      <div className="max-w-2xl">
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight text-[#5E0E26]">
          {discreetMode ? 'Guía de Uso y Cuidado Personal' : 'Protocolo Seguro, Ciencia y Salud Íntima'}
        </h1>
        <p className="mt-1.5 text-sm text-[#6A4F59] leading-relaxed">
          {discreetMode
            ? 'Pasos recomendados para la prueba externa, referencia de tonos y detalles de composición natural.'
            : 'Conoce el sustento químico de las antocianinas de la flor de Jamaica, cómo realizar la prueba externa de forma segura y aprende a interpretar las señales naturales de tu cuerpo.'}
        </p>
      </div>

      {/* 1. PROTOCOLO DE USO SEGURO Y RESTRICCIÓN DEL PROTOTIPO */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EFE3E8] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF0F5] text-[#B31353] flex items-center justify-center border border-[#F8C2D7]">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2B0C18]">
                Protocolo de Uso Seguro (Prueba Externa <em>in vitro</em>)
              </h2>
              <p className="text-xs text-[#7D6670]">
                Método recomendado para el prototipo JamaKiss
              </p>
            </div>
          </div>

          <ol className="space-y-3 text-xs sm:text-sm text-[#4A3B42]">
            <li className="flex gap-3 p-3 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA]">
              <span className="w-6 h-6 rounded-full bg-[#8D0F42] text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <p className="font-semibold text-[#2B0C18]">Prepara la gota de referencia (Punto Cero)</p>
                <p className="text-xs text-[#6B5A62] mt-0.5">
                  Coloca una gota de gel JamaKiss (color rojo brillante / fucsia, pH ~4.0) sobre un soporte limpio: un portaobjetos de vidrio o una hoja de papel blanco sin aroma.
                </p>
              </div>
            </li>
            <li className="flex gap-3 p-3 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA]">
              <span className="w-6 h-6 rounded-full bg-[#8D0F42] text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <p className="font-semibold text-[#2B0C18]">Toma de muestra externa con hisopo estéril</p>
                <p className="text-xs text-[#6B5A62] mt-0.5">
                  Recolecta una pequeña cantidad de secreción vaginal externa con un hisopo estéril y aplícala suavemente sobre la gota de gel JamaKiss.
                </p>
              </div>
            </li>
            <li className="flex gap-3 p-3 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA]">
              <span className="w-6 h-6 rounded-full bg-[#8D0F42] text-white font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <p className="font-semibold text-[#2B0C18]">Espera 30 a 60 segundos y lee el color</p>
                <p className="text-xs text-[#6B5A62] mt-0.5">
                  Con luz natural o neutra difusa, toma la fotografía sobre el fondo blanco o compárala con los 4 tonos de la pantalla.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Restricción de uso intravaginal + Descargos legales */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-amber-50/90 rounded-3xl border border-amber-200 p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <h3 className="text-sm font-bold">
                Restricción del Prototipo Artesanal
              </h3>
            </div>
            <p className="text-xs text-amber-950/85 leading-relaxed">
              La versión artesanal con extracto natural de flor de Jamaica y ácido cítrico/limón <strong>no debe introducirse directamente en el canal vaginal</strong> en pruebas con pacientes reales, ya que contiene azúcares naturales residuales (que pueden favorecer el crecimiento de hongos como <em>Candida</em>) y carece de esterilidad industrial y conservantes de grado farmacéutico.
            </p>
            <p className="text-[11px] text-amber-900/80 italic pt-1 border-t border-amber-200/80">
              Escalamiento futuro: en fase industrial el principio activo se estabiliza en laboratorio bajo normas de esterilidad o se inmoviliza en el aplicador/cánula.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#EFE3E8] p-5 space-y-2.5 flex-1">
            <div className="flex items-center gap-2 text-[#720E36]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <h3 className="text-sm font-bold">Descargos de Responsabilidad</h3>
            </div>
            <ul className="space-y-2 text-xs text-[#594A51] leading-relaxed list-disc pl-4">
              <li>
                <strong>Herramienta de tamizaje preliminar:</strong> JamaKiss es un indicador visual orientativo de alteraciones del pH vaginal; no sustituye un diagnóstico médico, obstétrico ni exámenes microbiológicos (examen en fresco o cultivo).
              </li>
              <li>
                <strong>Limitación ante ITS específicas:</strong> No detecta infecciones de transmisión sexual que no alteren el pH de forma inmediata (como VPH, herpes o clamidia en fases iniciales).
              </li>
              <li>
                <strong>Excepción Candidiasis:</strong> Los hongos como <em>Candida</em> mantienen el pH ácido (≤ 4.5), por lo que el gel sigue fucsia aunque haya picazón o flujo grumoso.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. ESCALA COLORIMÉTRICA COMPLETA DE FLOR DE JAMAICA */}
      <section className="bg-white rounded-3xl border border-[#EFE3E8] p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#2B0C18]">
              Escala Colorimétrica Real de Antocianinas (<em>Hibiscus sabdariffa</em>)
            </h2>
            <p className="text-xs text-[#7D6670] mt-0.5">
              A diferencia de la col morada, la flor de Jamaica ofrece tonos profundos de fucsia a morado oscuro/azul pizarra con alto contraste sobre papel blanco.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PH_ZONES.map((zone) => (
            <div
              key={zone.id}
              className="rounded-2xl border border-[#EFE6EA] p-4 bg-[#FDFBFC] flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center -space-x-2">
                    <span
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: zone.primaryHex }}
                    />
                    <span
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: zone.secondaryHex }}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#8E1436]">
                    pH {zone.phRange}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#2B0C18]">{zone.colorName}</h3>
                  <p className="text-[11px] text-[#8C737E] mt-0.5">{zone.visualReference}</p>
                </div>
                <p className="text-xs text-[#594A51] leading-relaxed">{zone.clinicalSummary}</p>
              </div>
              <div className="pt-2 border-t border-[#EFE6EA] text-[10px] font-medium text-[#8C737E]">
                {zone.shortLabel}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. GLOSARIO VISUAL DE FLUJO NORMAL VS ALERTA */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#2B0C18]">
            Glosario Visual: Flujo Normal vs. Señales de Alerta
          </h2>
          <p className="text-xs text-[#7D6670] mt-0.5">
            Conocer cómo cambia el flujo en tu ciclo reduce la ansiedad y te ayuda a saber cuándo consultar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {FLOW_GLOSSARY.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#EFE3E8] p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div
                  className={`h-14 rounded-xl bg-gradient-to-br ${item.swatchGradient} border border-black/5 flex items-center justify-center`}
                >
                  <span
                    className={`text-[11px] font-medium ${
                      item.status === 'normal' ? 'text-[#556638]' : 'text-[#8E1436]'
                    }`}
                  >
                    {item.status === 'normal' ? 'Fisiológico / Normal' : 'Signo de alerta'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#2B0C18]">{item.title}</h3>
                <p className="text-[11px] font-medium text-[#720E36]">{item.appearance}</p>
                <p className="text-[11px] text-[#6B5A62] leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. MITOS VS REALIDADES INTERACTIVOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B31353]" />
          <h2 className="text-base font-bold text-[#2B0C18]">
            Mitos vs. Realidades (Toca cada tarjeta para descubrir)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MYTH_CARDS.map((card) => {
            const isRevealed = revealedIds.includes(card.id);
            return (
              <button
                key={card.id}
                onClick={() => toggleMyth(card.id)}
                className="text-left bg-white hover:border-[#E75690] rounded-2xl border border-[#EFE3E8] p-4 transition-all shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8E1436]">
                    <HelpCircle className="w-3.5 h-3.5" />
                    {isRevealed ? card.tag : 'Toca para ver'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#2B0C18] leading-snug">{card.question}</p>
                {isRevealed ? (
                  <p className="text-xs text-[#594A51] leading-relaxed pt-2 border-t border-[#F3E6EC] fade-in-up">
                    {card.answer}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#B31353] font-medium">Ver explicación obstétrica →</p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. FICHA TÉCNICA DE FORMULACIÓN */}
      <section className="bg-white rounded-3xl border border-[#EFE3E8] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#FFF0F5] text-[#B31353] flex items-center justify-center border border-[#F8C2D7]">
            <Beaker className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#2B0C18]">
              Ficha Técnica de Formulación JamaKiss
            </h2>
            <p className="text-xs text-[#7D6670]">
              Composición natural y parámetros fisicoquímicos de respaldo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA] space-y-1">
            <p className="font-bold text-[#720E36]">Matriz polimérica (Vehículo)</p>
            <p className="text-[#594A51] leading-relaxed">
              Mucílago natural de <em>Linum usitatissimum</em> (linaza) al <strong>8%</strong> en agua purificada (o hidroxietilcelulosa en formulación de laboratorio). Matriz acuosa viscoelástica biocompatible.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA] space-y-1">
            <p className="font-bold text-[#720E36]">Agente colorimétrico activo</p>
            <p className="text-[#594A51] leading-relaxed">
              Extracto acuoso concentrado de cálices de <em>Hibiscus sabdariffa</em> (flor de Jamaica), rico en <strong>antocianinas</strong> sensibles a la concentración de iones H⁺.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA] space-y-1">
            <p className="font-bold text-[#720E36]">Regulador de pH basal</p>
            <p className="text-[#594A51] leading-relaxed">
              Ácido cítrico / ácido láctico ajustado a <strong>pH ≈ 4.0</strong> para garantizar el punto cero en tono rojo brillante / fucsia.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA] space-y-1">
            <p className="font-bold text-[#720E36] inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Compatibilidad y pureza
            </p>
            <p className="text-[#594A51] leading-relaxed">
              Fórmula <strong>100% libre de aceites</strong> (compatible con preservativos de látex) y <strong>libre de glicerina añadida</strong>.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA] space-y-1">
            <p className="font-bold text-[#720E36] inline-flex items-center gap-1.5">
              <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-600" />
              Conservación y vida útil
            </p>
            <p className="text-[#594A51] leading-relaxed">
              Al ser una fórmula natural sin parabenos, requiere <strong>refrigeración (2°C – 8°C)</strong> y posee una vida útil de <strong>3 a 5 días</strong> tras su preparación.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAF7F8] border border-[#EFE6EA] space-y-1">
            <p className="font-bold text-[#720E36] inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#B31353]" />
              Contexto de innovación
            </p>
            <p className="text-[#594A51] leading-relaxed">
              Propuesta de innovación en salud sexual y reproductiva preventiva orientada al tamizaje accesible y libre de estigmas.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

