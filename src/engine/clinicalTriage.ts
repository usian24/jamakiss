import { PH_ZONES, PhColorZone, PhZoneId } from '../data/jamakissData';

export type FlowOption = 'normal' | 'grumoso' | 'grisaceo' | 'amarillo_verdoso';
export type SymptomOption = 'sin_molestias' | 'olor_pescado' | 'olor_fermentado' | 'picazon_ardor' | 'dolor_molestia';
export type CycleOption = 'ninguno' | 'ovulacion' | 'menstruacion' | 'postcoital' | 'embarazo';

export interface TriageInput {
  zoneId: PhZoneId;
  flow: FlowOption;
  symptoms: SymptomOption[];
  cycle: CycleOption;
}

export type RiskLevel = 'healthy' | 'caution_context' | 'candida_exception' | 'evaluate' | 'priority_obstetric';

export interface ClinicalAssessment {
  zone: PhColorZone;
  riskLevel: RiskLevel;
  headline: string;
  calmReassurance: string;
  clinicalExplanation: string;
  selfCareTips: string[];
  recommendCenters: boolean;
  priorityTag: string;
  priorityStyle: string;
  summaryBullets: string[];
}

export const FLOW_LABELS: Record<FlowOption, string> = {
  normal: 'Transparente / Normal',
  grumoso: 'Blanco espeso / Grumoso',
  grisaceo: 'Grisáceo / Líquido',
  amarillo_verdoso: 'Amarillento / Verdoso',
};

export const SYMPTOM_LABELS: Record<SymptomOption, string> = {
  sin_molestias: 'Sin olor fuerte ni molestias',
  olor_pescado: 'Olor fuerte / Similar a pescado',
  olor_fermentado: 'Olor dulce / Fermentado',
  picazon_ardor: 'Picazón, ardor o irritación',
  dolor_molestia: 'Molestia al orinar o en relaciones',
};

export const CYCLE_LABELS: Record<CycleOption, string> = {
  ninguno: 'Día habitual del ciclo',
  ovulacion: 'Ovulación / Días fértiles',
  menstruacion: 'Menstruación o días previos',
  postcoital: 'Relaciones en las últimas 24h',
  embarazo: 'Estoy embarazada',
};

const BASE_SELFCARE = [
  'Usa ropa interior de algodón transpirable y evita prendas muy ajustadas durante la molestia.',
  'Lava solo la zona externa con agua tibia; evita jabones perfumados y duchas vaginales internas.',
  'No te automediques con óvulos ni cremas antes de que una obstetra o médica confirme la causa.',
];

/**
 * Motor clínico determinístico de JamaKiss:
 * Cruza el tono real de antocianinas con flujo, síntomas y etapa del ciclo
 * para cubrir excepción de candidiasis, embarazo y factores confusores.
 */
export function evaluateClinicalTriage(input: TriageInput): ClinicalAssessment {
  const zone = PH_ZONES.find((z) => z.id === input.zoneId) || PH_ZONES[0];
  const hasItching = input.symptoms.includes('picazon_ardor');
  const hasFishyOdor = input.symptoms.includes('olor_pescado');
  const hasPain = input.symptoms.includes('dolor_molestia');
  const hasAnySymptom =
    input.symptoms.some((s) => s !== 'sin_molestias') || input.flow !== 'normal';

  const summaryBullets = [
    `Tono en gel JamaKiss: ${zone.colorName} (pH estimado ${zone.phRange})`,
    `Flujo reportado: ${FLOW_LABELS[input.flow]}`,
    `Síntomas: ${input.symptoms.map((s) => SYMPTOM_LABELS[s]).join(', ') || 'Ninguno'}`,
    `Contexto del ciclo: ${CYCLE_LABELS[input.cycle]}`,
  ];

  // 1. PRIORIDAD MÁXIMA: Embarazo + Alcalinidad alta (pH >= 7.0) -> posible fuga de líquido amniótico
  if (input.cycle === 'embarazo' && input.zoneId === 'alto') {
    return {
      zone,
      riskLevel: 'priority_obstetric',
      headline: 'Atención Obstétrica Prioritaria en Embarazo',
      calmReassurance:
        'Mantén la calma, hiciste muy bien en revisarte. Durante el embarazo, un viraje a azul grisáceo o verdoso (pH ≥ 7.0) requiere confirmación profesional pronto.',
      clinicalExplanation:
        'El líquido amniótico es alcalino (pH 7.0 – 7.5), por lo que en gestación este tono podría indicar una pérdida de líquido o una infección marcada. Es importante acudir a evaluación obstétrica para tu tranquilidad y la de tu bebé.',
      selfCareTips: [
        'Acude a tu centro de salud u hospital materno-infantil hoy mismo para una valoración obstétrica.',
        'Lleva tu Ficha de Tamizaje JamaKiss y evita duchas vaginales o aplicar cremas antes del examen.',
        'Si notas salida continua de líquido claro o contracciones, ve directamente por emergencias obstétricas.',
      ],
      recommendCenters: true,
      priorityTag: 'Evaluación Prioritaria',
      priorityStyle: 'bg-rose-100 text-rose-900 border-rose-300',
      summaryBullets,
    };
  }

  // 2. EXCEPCIÓN CLÍNICA CLAVE: pH saludable (<= 4.5) pero con síntomas de Candidiasis
  if (input.zoneId === 'normal' && (input.flow === 'grumoso' || hasItching || input.symptoms.includes('olor_fermentado'))) {
    return {
      zone,
      riskLevel: 'candida_exception',
      headline: 'Excepción Clínica: Posible Candidiasis (pH Ácido Preservado)',
      calmReassurance:
        'Respira tranquila. Aunque el gel JamaKiss se mantuvo fucsia brillante (pH ácido normal), tus molestias son válidas y merecen atención.',
      clinicalExplanation:
        'Las infecciones por hongos como Candida NO alcalinizan el pH vaginal (se mantiene ≤ 4.5), por eso el gel no cambia de color. La combinación de pH ácido con picazón o flujo blanco grumoso orienta a candidiasis y requiere confirmación profesional.',
      selfCareTips: BASE_SELFCARE,
      recommendCenters: true,
      priorityTag: 'Nota Preventiva: Candidiasis',
      priorityStyle: 'bg-pink-50 text-pink-900 border-pink-300',
      summaryBullets,
    };
  }

  // 3. pH normal + otros síntomas inusuales (ej. dolor o flujo verdoso/grisáceo)
  if (input.zoneId === 'normal' && hasAnySymptom) {
    return {
      zone,
      riskLevel: 'evaluate',
      headline: 'pH Ácido Normal, pero con Molestias Reportadas',
      calmReassurance:
        'Tu acidez vaginal se encuentra en rango protector, pero como nos cuentas que hay síntomas presentes, lo más cuidadoso es revisarlo con una especialista.',
      clinicalExplanation:
        'Existen infecciones o irritaciones locales que pueden presentarse inicialmente sin elevar el pH vaginal. El tamizaje de pH es orientativo y nunca reemplaza la valoración de tus síntomas.',
      selfCareTips: BASE_SELFCARE,
      recommendCenters: true,
      priorityTag: 'Conviene Consultar',
      priorityStyle: 'bg-amber-50 text-amber-900 border-amber-200',
      summaryBullets,
    };
  }

  // 4. ESTADO BASAL SALUDABLE
  if (input.zoneId === 'normal') {
    return {
      zone,
      riskLevel: 'healthy',
      headline: 'Equilibrio de Flora Vaginal Saludable',
      calmReassurance: zone.calmMessage,
      clinicalExplanation:
        'El tono rojo brillante / fucsia confirma que el pH se mantiene entre 3.8 y 4.5, el ambiente ácido ideal donde los lactobacilos protegen tu zona íntima de forma natural.',
      selfCareTips: [
        'Continúa con hábitos suaves: agua tibia para higiene externa y ropa interior de algodón.',
        'Recuerda que cambios leves de textura a lo largo de tu ciclo menstrual son completamente normales.',
        'Realiza tus controles preventivos obstétricos o ginecológicos anuales.',
      ],
      recommendCenters: false,
      priorityTag: 'Sin Alteración',
      priorityStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      summaryBullets,
    };
  }

  // 5. POSIBLE FACTOR FISIOLÓGICO TRANSITORIO (Postcoital o Menstruación sin síntomas de infección)
  if (
    (input.cycle === 'postcoital' || input.cycle === 'menstruacion') &&
    !hasFishyOdor &&
    !hasItching &&
    !hasPain &&
    input.flow === 'normal'
  ) {
    const reasonText =
      input.cycle === 'postcoital'
        ? 'El líquido seminal es alcalino (pH 7.2 – 8.0) para proteger a los espermatozoides y puede elevar temporalmente el pH vaginal durante 24 horas.'
        : 'La sangre menstrual tiene un pH cercano a 7.4, por lo que desplaza temporalmente la acidez natural durante el periodo y los días inmediatamente cercanos.';

    return {
      zone,
      riskLevel: 'caution_context',
      headline: 'Elevación de pH Posiblemente Transitoria',
      calmReassurance:
        'Respira tranquila. Como no reportas olor fuerte ni molestias, es muy probable que este cambio de color se deba a un factor temporal completamente normal.',
      clinicalExplanation: `${reasonText} Te sugerimos esperar entre 24 y 48 horas (o al finalizar el periodo) y repetir la prueba externa JamaKiss para confirmar si tu acidez volvió al tono fucsia.`,
      selfCareTips: [
        'Repite la prueba in vitro en 24–48 horas (fuera de días de sangrado y sin relaciones previas).',
        'Evita duchas vaginales para "normalizar" el pH: tu flora se recupera sola de forma natural.',
        'Si el tono oscuro persiste o aparece olor fuerte/picazón, agenda una orientación obstétrica.',
      ],
      recommendCenters: false,
      priorityTag: 'Factor Transitorio',
      priorityStyle: 'bg-sky-50 text-sky-900 border-sky-200',
      summaryBullets,
    };
  }

  // 6. ALTERACIÓN DE PH (Disbiosis leve, Vaginosis / Tricomoniasis, o Alcalinidad alta con/sin síntomas)
  const suggestsBV = hasFishyOdor || input.flow === 'grisaceo';
  const suggestsTrich = input.flow === 'amarillo_verdoso';

  let specificHint =
    'Se detectó pérdida de acidez vaginal protectora. Esto suele indicar un desbalance de la flora (disbiosis) que una obstetra o médica puede evaluar con un examen sencillo.';
  if (suggestsBV) {
    specificHint =
      'La pérdida de acidez junto con flujo grisáceo u olor intenso suele orientar a vaginosis bacteriana (un desequilibrio común de las bacterias de tu flora, no necesariamente una ITS). Tiene tratamiento sencillo con receta médica.';
  } else if (suggestsTrich) {
    specificHint =
      'El pH alcalino acompañado de flujo amarillento/verdoso sugiere una infección que requiere valoración obstétrica directa (como examen en fresco) para indicar el tratamiento exacto.';
  } else if (input.cycle === 'embarazo') {
    specificHint =
      'Durante el embarazo cuidar el equilibrio del pH vaginal es muy importante para prevenir molestias o infecciones. Te recomendamos comentarlo en tu control prenatal.';
  }

  return {
    zone,
    riskLevel: 'evaluate',
    headline:
      input.zoneId === 'leve'
        ? 'Posible Disbiosis Leve (Descenso Inicial de Acidez)'
        : 'Posible Alteración del Equilibrio Vaginal',
    calmReassurance: zone.calmMessage,
    clinicalExplanation: specificHint,
    selfCareTips: BASE_SELFCARE,
    recommendCenters: true,
    priorityTag: input.zoneId === 'leve' ? 'Orientación Sugerida' : 'Evaluación Recomendada',
    priorityStyle:
      input.zoneId === 'leve'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : 'bg-purple-50 text-purple-900 border-purple-200',
    summaryBullets,
  };
}

/**
 * Fallback empático local cuando el servidor Gemini no está activo o sin API key.
 */
export function buildLocalEmpatheticReply(userMessage: string, assessment: ClinicalAssessment | null): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('candid') || lower.includes('hongo') || lower.includes('grumoso') || lower.includes('picazon') || lower.includes('picazón')) {
    return '¡Muy buena pregunta! En la candidiasis (infección por hongos), el pH vaginal casi siempre se mantiene ácido (≤ 4.5), por lo que el gel JamaKiss sigue rojo/fucsia. Si sientes picazón, ardor o ves flujo blanco espeso/grumoso, te recomiendo acudir a consulta obstétrica aunque el gel no haya cambiado de color. Mientras tanto, evita automedicarte con óvulos sin receta.';
  }

  if (lower.includes('embaraz') || lower.includes('gesta') || lower.includes('amniot') || lower.includes('bebe') || lower.includes('bebé')) {
    return 'Durante el embarazo es súper valioso cuidar tu flora vaginal. Recuerda que el prototipo artesanal de JamaKiss solo debe usarse de forma externa (in vitro con hisopo sobre una gota aparte). Si observas un viraje a azul grisáceo/verdoso (pH ≥ 7.0) o sospechas salida de líquido claro, acude pronto a tu evaluación obstétrica para confirmar que todo esté bien.';
  }

  if (lower.includes('semen') || lower.includes('relacion') || lower.includes('coito') || lower.includes('sexo') || lower.includes('preservativo') || lower.includes('condon')) {
    return 'El líquido seminal es naturalmente alcalino (pH 7.2 – 8.0), así que tras tener relaciones sin preservativo es normal que el pH suba temporalmente por unas 24 horas y el gel marque morado o azul sin que exista infección. Además, como dato técnico, la fórmula base de JamaKiss es 100% libre de aceites y glicerina (compatible con látex), aunque el prototipo artesanal actual solo se usa en prueba externa in vitro.';
  }

  if (lower.includes('como usar') || lower.includes('cómo usar') || lower.includes('protocolo') || lower.includes('intravaginal') || lower.includes('dentro')) {
    return 'Para usar el prototipo JamaKiss de forma segura: 1) Coloca una gota del gel (fucsia brillante) sobre un portaobjetos limpio o papel blanco. 2) Recolecta una pequeña muestra externa con un hisopo estéril y aplícala sobre la gota. 3) Espera de 30 a 60 segundos y compara el tono. Importante: la versión artesanal no debe introducirse en el canal vaginal porque contiene azúcares naturales de la flor y carece de esterilidad industrial.';
  }

  if (lower.includes('color') || lower.includes('morado') || lower.includes('vino') || lower.includes('azul') || lower.includes('rojo') || lower.includes('fucsia')) {
    return 'Las antocianinas de la flor de Jamaica cambian así: Rojo brillante/Fucsia = pH 3.8–4.5 (saludable); Vino tinto oscuro = pH 4.7–5.5 (disbiosis leve); Morado/Lila oscuro = pH 5.6–6.5 (alteración moderada, como vaginosis); Azul grisáceo/Verdoso = pH ≥ 7.0 (alcalinidad alta, semen, menstruación o líquido amniótico).';
  }

  if (lower.includes('centro') || lower.includes('clinica') || lower.includes('clínica') || lower.includes('donde') || lower.includes('dónde') || lower.includes('huanuco') || lower.includes('huánuco')) {
    return 'Puedes abrir la pestaña "Centros Cercanos" aquí arriba para activar tu ubicación GPS y encontrar centros de salud MINSA/SIS (con atención diferenciada juvenil) o consultorios obstétricos privados en Huánuco, con ruta discreta en Google Maps. También puedes generar tu Ficha de Tamizaje para mostrarla en consulta si te da un poco de nervios explicar tus síntomas.';
  }

  if (lower.includes('privad') || lower.includes('foto') || lower.includes('segur') || lower.includes('anonim')) {
    return 'Estás en un espacio seguro, anónimo y libre de juicios. No pedimos tu nombre, DNI ni correo. Las fotos que subas se analizan localmente en tu dispositivo (o en memoria si activas Gemini) y se eliminan automáticamente al descartarlas o cerrar la página.';
  }

  if (assessment) {
    return `Según tu lectura actual (${assessment.zone.colorName}, pH ${assessment.zone.phRange} — ${assessment.headline}): ${assessment.calmReassurance} ${assessment.clinicalExplanation} Si deseas, puedes generar tu Ficha de Tamizaje o revisar los centros de atención cercanos en Huánuco.`;
  }

  return 'Gracias por confiarme tu consulta. Tener cambios en el flujo o el pH es muy común y revisarte es un gran acto de autocuidado. Puedes contarme qué color marcó tu prueba JamaKiss, si notas algún síntoma (picazón, olor, cambio de flujo) o explorar los botones rápidos de abajo.';
}

