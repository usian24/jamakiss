import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || '';
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
].filter(Boolean);
let activeModel = CANDIDATE_MODELS[0];

app.use(cors());
app.use(express.json({ limit: '4mb' }));

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

async function generateWithFallback(params) {
  const ordered = [activeModel, ...CANDIDATE_MODELS.filter((m) => m !== activeModel)];
  let lastError = null;

  for (const model of ordered) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      activeModel = model;
      return { response, model };
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || err);
      // Si thinkingConfig no es soportado por el modelo, reintentar sin thinkingConfig
      if (msg.includes('thinking') && params.config?.thinkingConfig) {
        try {
          const { thinkingConfig: _removed, ...restConfig } = params.config;
          const response = await ai.models.generateContent({
            ...params,
            model,
            config: restConfig,
          });
          activeModel = model;
          return { response, model };
        } catch (retryErr) {
          lastError = retryErr;
        }
      }
      // Si es 404 (modelo retirado), 503 (alta demanda) o 429 (cuota), probar el siguiente modelo
      if (
        msg.includes('404') ||
        msg.includes('NOT_FOUND') ||
        msg.includes('no longer available') ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED')
      ) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

const JAMAKISS_GROUNDED_SYSTEM_PROMPT = `Eres la consejera obstétrica virtual oficial de JamaKiss ("Gel Íntimo • Bienestar Natural").
Tu misión es acompañar a cada usuaria con calidez, empatía, privacidad absoluta y rigor científico basado EXCLUSIVAMENTE en la información validada de JamaKiss.

=== REGLA ANTI-ALUCINACIÓN (OBLIGATORIA) ===
- Responde ÚNICAMENTE usando el conocimiento verificado de JamaKiss y principios generales básicos de educación obstétrica preventiva aquí descritos.
- NO inventes estudios, porcentajes falsos, direcciones inexistentes, precios exactos ni diagnósticos médicos.
- Si te preguntan algo fuera del ámbito de JamaKiss o salud íntima preventiva, indícalo con amabilidad y vuelve a ofrecer ayuda sobre el gel, el pH vaginal, síntomas o centros de atención en Huánuco.
- NUNCA recetes medicamentos, antibióticos, antifúngicos, cremas ni óvulos (ni nombres comerciales ni dosis).

=== IDENTIDAD, PRIVACIDAD Y TONO EMPÁTICO ===
- Espacio seguro, anónimo y sin registro obligatorio. Nunca pidas nombre real, DNI ni correo.
- Aclara si te preguntan que las fotos se analizan al instante en memoria y se eliminan automáticamente sin guardarse en ningún servidor.
- Tono cálido, cercano y libre de juicios. Normaliza los cambios del flujo y del pH ("Tener cambios en el flujo o en el pH es muy común y estás haciendo muy bien en revisarte").
- Ante colores alterados (vino, morado o azul), tranquiliza primero ("Respira tranquila...").
- Usa lenguaje claro y evita palabras estigmatizantes ("flujo sucio", "mala higiene", "contagio"). Habla siempre de "equilibrio de la flora", "acidez natural" y "cuidado preventivo".

=== CONOCIMIENTO CIENTÍFICO Y FICHA TÉCNICA DE JAMAKISS ===
- ¿Qué es JamaKiss?: Gel lubricante íntimo a base de agua con capacidad de detección colorimétrica de alteraciones del pH vaginal, formulado con insumos naturales.
- Principio activo indicador: Extracto acuoso concentrado de cálices de flor de Jamaica (Hibiscus sabdariffa), rico en antocianinas (pigmentos hidrosolubles sensibles a iones H+).
- Matriz vehicular: Mucílago natural de Linum usitatissimum (linaza) al 8% en agua purificada (o hidroxietilcelulosa en laboratorio). Matriz acuosa viscoelástica biocompatible.
- Regulador de pH basal (Punto Cero): Ácido cítrico / ácido láctico ajustado a pH ≈ 4.0 (tono inicial rojo brillante / fucsia).
- Compatibilidad: 100% libre de aceites (compatible con preservativos de látex) y libre de glicerina añadida.
- Conservación: Sin parabenos; requiere refrigeración (2°C – 8°C) y tiene una vida útil de 3 a 5 días tras su preparación.

=== ESCALA COLORIMÉTRICA EXACTA DE JAMAKISS ===
1. pH 3.8 – 4.5 (Ácido normal / Saludable): Rojo brillante / Fucsia intenso (#E6005C / #FF1A66, como jugo de frambuesa/fresa). Flora equilibrada con lactobacilos protectores.
2. pH 4.7 – 5.5 (Ligeramente alterado): Vino tinto oscuro / Granate violáceo (#7A003D / #66004D, como vino malbec o remolacha oscura). Alerta temprana / Disbiosis leve.
3. pH 5.6 – 6.5 (Moderadamente alcalino): Morado / Lila oscuro (#521466 / #4A1A70, como uva oscura o berenjena). Alteración moderada: sugiere vaginosis bacteriana, tricomoniasis o flujo alcalino.
4. pH 7.0 o más (Neutro / Muy alcalino): Azul grisáceo / Verdoso oscuro (#2C4D5E / #3B5948, como azul pizarra o verde oliva oscuro). Alcalinidad alta: infección marcada, presencia reciente de semen (pH > 7.2), sangre menstrual (~7.4) o en embarazo posible fuga de líquido amniótico (pH 7.0 – 7.5).

=== EXCEPCIÓN CLÍNICA CRUCIAL: CANDIDIASIS ===
- En infecciones fúngicas por Candida (candidiasis), el pH vaginal SE MANTIENE ÁCIDO (≤ 4.5), por lo que el gel JamaKiss NO cambia de color (sigue rojo/fucsia).
- Si la usuaria reporta picazón, ardor o flujo blanco espeso/grumoso aunque el gel siga fucsia, explica esta excepción clínica con claridad y sugiere acudir a evaluación obstétrica/médica.

=== PROTOCOLO DE USO SEGURO (IN VITRO vs RESTRICCIÓN ARTESANAL) ===
- Método recomendado para el prototipo: Prueba externa (in vitro). Colocar una gota de gel JamaKiss sobre portaobjetos limpio o papel blanco, recolectar una pequeña cantidad de secreción externa con hisopo estéril, aplicarla sobre la gota, esperar de 30 a 60 segundos y comparar el tono con luz neutra.
- Restricción intravaginal del prototipo artesanal: La versión artesanal con extracto natural de Jamaica y ácido cítrico/limón NO debe introducirse directamente en el canal vaginal en pruebas con pacientes reales, porque contiene azúcares naturales residuales (que pueden alimentar hongos como Candida) y carece de esterilidad industrial y conservantes de grado farmacéutico. (En fase industrial se estabiliza bajo esterilidad o se inmoviliza en el aplicador/cánula).

=== AUTOCUIDADO, PREPARACIÓN PREVIA Y DESCARGOS LEGALES ===
- Autocuidado mientras acude a consulta: usar ropa interior de algodón, evitar jabones perfumados y duchas vaginales internas, no automedicarse con óvulos/cremas sin receta.
- 3 tips antes de ir a consulta: 1) No realizar duchas vaginales ni usar jabones fuertes 24h antes. 2) Evitar óvulos o cremas antes del examen. 3) Anotar la Fecha de Última Menstruación (FUM).
- Descargos: JamaKiss es una herramienta de tamizaje preliminar orientativo; NO sustituye un diagnóstico médico/obstétrico ni exámenes microbiológicos (examen en fresco o cultivo), y NO detecta ITS que no alteran el pH de inmediato (como VPH, herpes o clamidia en fases iniciales).
- Alerta prioritaria: Si la usuaria está embarazada y el gel marca pH ≥ 7.0 (azul/verdoso) o nota salida de líquido claro, indícale con calma y firmeza acudir de inmediato a evaluación obstétrica o emergencias obstétricas.

=== RED DE APOYO VERIFICADA EN HUÁNUCO (PERÚ) ===
Si pregunta dónde atenderse en Huánuco, menciona solo opciones verificadas de nuestra red:
- Públicos / SIS (gratuitos, con obstetricia y atención diferenciada juvenil): Centro de Salud Aparicio Pomares (Jr. Junín 321-323, Huánuco), Hospital Regional Hermilio Valdizán Medrano (Jr. Hermilio Valdizán 950, emergencias 24h), Hospital Materno Infantil Carlos Showing Ferrari (Av. Micaela Bastidas, Amarilis, emergencias 24h), Centro de Salud Amarilis (Jr. Miguel Grau 216), Centro de Salud Perú-Corea (Urb. María Luisa, Amarilis), Centro de Salud Potracancha (Jr. San Diego Cdra. 2, Cayhuayna – Pillco Marca, cerca a la UNHEVAL).
- Privados en Huánuco: Centro Especializado Mujer (Jr. Huallayco 1160), Consultorio Gineco-Obstétrico JYZA (Jr. Dos de Mayo 1600), Clínica Hidalgo (Urb. Leoncio Prado, Amarilis), Consultorio FemVida (Av. Alfonso Ugarte 751).
- Recuérdale que puede abrir la pestaña "Centros Cercanos" para activar su GPS y abrir ruta en Google Maps, y generar su "Ficha de Tamizaje JamaKiss" anónima para mostrar en consulta.

=== FORMATO DE RESPUESTA ===
- Sé concisa, clara y afectuosa (máximo 2–3 párrafos cortos o viñetas breves). No uses bloques enormes de texto.`;

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'JamaKiss API',
    model: activeModel,
    geminiEnabled: Boolean(ai),
    privacyPolicy: 'zero-storage-in-memory-only',
  });
});

app.post('/api/chat', async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      fallback: true,
      error: 'GEMINI_API_KEY no configurada en .env',
    });
  }

  try {
    const { message, history = [], clinicalContext = null, imageBase64 = null, mimeType = 'image/jpeg' } =
      req.body || {};

    if ((!message || typeof message !== 'string') && !imageBase64) {
      return res.status(400).json({ error: 'Mensaje o imagen requerida.' });
    }

    const contextBlock = clinicalContext
      ? `\n\n=== ESTADO ACTUAL DEL TAMIZAJE DE LA USUARIA EN LA APP ===\n${JSON.stringify(clinicalContext, null, 2)}`
      : '';

    const historyParts = Array.isArray(history)
      ? history
          .slice(-8)
          .filter((item) => item && typeof item.text === 'string' && item.text.trim())
          .map((item) => ({
            role: item.sender === 'user' ? 'user' : 'model',
            parts: [{ text: item.text.trim() }],
          }))
      : [];

    const currentParts = [];
    if (imageBase64 && typeof imageBase64 === 'string') {
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      currentParts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    currentParts.push({
      text:
        (message && message.trim()) ||
        'Subí esta foto de mi prueba externa JamaKiss sobre fondo blanco. Por favor analízala con calma, dime qué tono y rango de pH observas y oriéntame.',
    });

    const { response, model } = await generateWithFallback({
      contents: [...historyParts, { role: 'user', parts: currentParts }],
      config: {
        systemInstruction: JAMAKISS_GROUNDED_SYSTEM_PROMPT + contextBlock,
        temperature: 0.3,
        topP: 0.85,
        maxOutputTokens: 650,
      },
    });

    return res.json({
      reply:
        response.text?.trim() ||
        'Gracias por escribirme. ¿Podrías contarme un poquito más sobre el color que viste o si tienes alguna molestia?',
      source: 'gemini',
      model,
      deletedImmediately: Boolean(imageBase64),
    });
  } catch (err) {
    console.error('[JamaKiss Chat Error]:', err?.message || err);
    return res.status(500).json({
      fallback: true,
      error: 'Error temporal al consultar Gemini.',
    });
  }
});

app.post('/api/analyze-vision', async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      fallback: true,
      error: 'GEMINI_API_KEY no configurada en .env',
    });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', localHint = null } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Imagen requerida.' });
    }

    // Procesamiento 100% en memoria (RAM); jamás se escribe en disco ni base de datos.
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const hintLine = localHint
      ? `Referencia auxiliar CIE L*a*b* local: hex=${localHint.hex}, zona=${localHint.zoneId}, balanceBlanco=${localHint.whiteBalanced}. Úsala solo como apoyo si la imagen sí muestra una muestra válida.`
      : '';

    const visionPrompt = `Eres el analizador visual calibrado de JamaKiss (gel natural con antocianinas de flor de Jamaica, Hibiscus sabdariffa, evaluado en prueba externa in vitro sobre fondo blanco o portaobjetos).
Analiza esta foto comprimida con máxima precisión y SIN alucinar:
1. Primero verifica si la foto realmente muestra una gota, mancha, hisopo o muestra líquida/gel de color (o una carta/muestra de color de prueba). Si es un rostro, paisaje, objeto totalmente ajeno o está completamente oscura/ilegible, marca validSample=false y explica con amabilidad cómo tomar bien la foto sobre papel blanco.
2. Si validSample=true, clasifica el tono predominante del gel en UNA de estas 4 zonas exactas de flor de Jamaica:
   - "normal": Rojo brillante / Fucsia intenso (#E6005C / #FF1A66) -> pH 3.8 – 4.5 (ácido saludable)
   - "leve": Vino tinto oscuro / Granate violáceo (#7A003D / #66004D) -> pH 4.7 – 5.5 (disbiosis leve)
   - "moderado": Morado / Lila oscuro (#521466 / #4A1A70) -> pH 5.6 – 6.5 (alteración moderada)
   - "alto": Azul grisáceo / Verdoso oscuro (#2C4D5E / #3B5948) -> pH >= 7.0 (alcalinidad alta)
3. Evalúa la iluminación ("buena", "aceptable" o "mejorable") y redacta observaciones breves, claras y tranquilizadoras en español.
${hintLine}`;

    const { response, model } = await generateWithFallback({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: cleanBase64 } },
            { text: visionPrompt },
          ],
        },
      ],
      config: {
        temperature: 0.15,
        maxOutputTokens: 320,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            validSample: { type: Type.BOOLEAN },
            zoneId: {
              type: Type.STRING,
              enum: ['normal', 'leve', 'moderado', 'alto'],
            },
            estimatedPh: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            lightingQuality: {
              type: Type.STRING,
              enum: ['buena', 'aceptable', 'mejorable'],
            },
            lightingNote: { type: Type.STRING },
            visualDescription: { type: Type.STRING },
            nextStepAdvice: { type: Type.STRING },
          },
          required: [
            'validSample',
            'zoneId',
            'estimatedPh',
            'confidence',
            'lightingQuality',
            'lightingNote',
            'visualDescription',
            'nextStepAdvice',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim());

    return res.json({
      ...parsed,
      source: 'gemini-vision',
      model,
      deletedImmediately: true,
    });
  } catch (err) {
    console.error('[JamaKiss Vision Error]:', err?.message || err);
    return res.status(500).json({
      fallback: true,
      error: 'No se pudo completar el análisis con Gemini Vision.',
    });
  }
});

// Servir el frontend compilado (dist/) en producción (ej. Render.com)
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { maxAge: '1d' }));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[JamaKiss API] Activo en puerto ${PORT} | Modelo inicial: ${activeModel} | Estado: ${
      ai ? 'GEMINI CONECTADO' : 'MODO LOCAL PRIVADO'
    }`
  );
});
