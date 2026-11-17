export type PhZoneId = 'normal' | 'leve' | 'moderado' | 'alto';

export interface PhColorZone {
  id: PhZoneId;
  phRange: string;
  phEstimate: number;
  positionPercent: number;
  label: string;
  shortLabel: string;
  colorName: string;
  visualReference: string;
  primaryHex: string;
  secondaryHex: string;
  referenceHexes: string[];
  badgeText: string;
  badgeStyle: string;
  clinicalSummary: string;
  calmMessage: string;
  orbColors: {
    deep: [number, number, number];
    mid: [number, number, number];
    bright: [number, number, number];
  };
}

export const PH_ZONES: PhColorZone[] = [
  {
    id: 'normal',
    phRange: '3.8 – 4.5',
    phEstimate: 4.1,
    positionPercent: 14,
    label: 'pH Ácido Fisiológico (Saludable)',
    shortLabel: 'Saludable',
    colorName: 'Rojo brillante / Fucsia intenso',
    visualReference: 'Similar al jugo de frambuesa o fresa concentrado (punto cero basal).',
    primaryHex: '#E6005C',
    secondaryHex: '#FF1A66',
    referenceHexes: ['#E6005C', '#FF1A66', '#D4145A', '#C81D59'],
    badgeText: 'pH Saludable',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    clinicalSummary:
      'Sin alteración de acidez: el gel conservó su tono fucsia basal, reflejando una flora vaginal equilibrada con predominio de lactobacilos protectores.',
    calmMessage:
      'Tu pH vaginal se mantiene en su rango ácido natural protector. ¡Qué buena noticia que te tomes el tiempo de cuidarte!',
    orbColors: {
      deep: [0.42, 0.02, 0.17],
      mid: [0.82, 0.07, 0.34],
      bright: [1.0, 0.28, 0.56],
    },
  },
  {
    id: 'leve',
    phRange: '4.7 – 5.5',
    phEstimate: 5.1,
    positionPercent: 42,
    label: 'Alerta Temprana / Disbiosis Leve',
    shortLabel: 'Disbiosis leve',
    colorName: 'Vino tinto oscuro / Granate violáceo',
    visualReference: 'Similar al vino malbec o remolacha oscura.',
    primaryHex: '#7A003D',
    secondaryHex: '#66004D',
    referenceHexes: ['#7A003D', '#66004D', '#801045', '#5C0B38'],
    badgeText: 'Alerta Temprana',
    badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200',
    clinicalSummary:
      'Comienza una pérdida leve de acidez protectora. Puede relacionarse con un desbalance inicial de la flora, productos de higiene o cambios del ciclo.',
    calmMessage:
      'Respira tranquila. Un tono vino oscuro indica que tu pH subió un poquito; es muy común y muchas veces se trata de un desbalance leve con solución sencilla.',
    orbColors: {
      deep: [0.22, 0.01, 0.12],
      mid: [0.48, 0.03, 0.24],
      bright: [0.72, 0.15, 0.44],
    },
  },
  {
    id: 'moderado',
    phRange: '5.6 – 6.5',
    phEstimate: 6.0,
    positionPercent: 69,
    label: 'Alteración Moderada (Alcalinidad)',
    shortLabel: 'Alteración moderada',
    colorName: 'Morado / Lila oscuro',
    visualReference: 'Similar a la uva oscura o berenjena.',
    primaryHex: '#521466',
    secondaryHex: '#4A1A70',
    referenceHexes: ['#521466', '#4A1A70', '#5E2375', '#3E1559'],
    badgeText: 'Sugiere Evaluación',
    badgeStyle: 'bg-purple-50 text-purple-900 border-purple-200',
    clinicalSummary:
      'Pérdida moderada de la acidez vaginal. Este viraje suele asociarse con vaginosis bacteriana, tricomoniasis o presencia de flujo alcalino.',
    calmMessage:
      'Respira tranquila. Ver un tono morado no significa necesariamente algo grave; suele reflejar que las bacterias buenas perdieron equilibrio temporalmente y una obstetra puede ayudarte rápido.',
    orbColors: {
      deep: [0.15, 0.03, 0.24],
      mid: [0.34, 0.1, 0.46],
      bright: [0.58, 0.28, 0.78],
    },
  },
  {
    id: 'alto',
    phRange: '7.0 o más',
    phEstimate: 7.2,
    positionPercent: 93,
    label: 'Alcalinidad Alta (Neutro / Alcalino)',
    shortLabel: 'Alcalinidad alta',
    colorName: 'Azul grisáceo / Verdoso oscuro',
    visualReference: 'Similar al azul pizarra o verde oliva oscuro.',
    primaryHex: '#2C4D5E',
    secondaryHex: '#3B5948',
    referenceHexes: ['#2C4D5E', '#3B5948', '#244252', '#345047'],
    badgeText: 'Alcalinidad Alta',
    badgeStyle: 'bg-slate-100 text-slate-900 border-slate-300',
    clinicalSummary:
      'Alcalinidad marcada. Puede deberse a una infección más pronunciada, pero también a presencia reciente de semen (pH > 7.2), sangre menstrual (~7.4) o, en embarazo, fuga de líquido amniótico.',
    calmMessage:
      'Mantén la calma. Primero revisemos el contexto (menstruación, relaciones recientes o embarazo), ya que factores cotidianos también generan este tono. Si no aplican o estás gestando, conviene evaluarlo pronto.',
    orbColors: {
      deep: [0.08, 0.16, 0.2],
      mid: [0.18, 0.32, 0.36],
      bright: [0.36, 0.56, 0.58],
    },
  },
];

export interface MythCard {
  id: string;
  question: string;
  tag: 'Mito' | 'Realidad' | 'Dato clave';
  answer: string;
}

export const MYTH_CARDS: MythCard[] = [
  {
    id: 'soap',
    question: '¿Sabías que lavar la zona íntima con jabón perfumado altera tu pH natural?',
    tag: 'Realidad',
    answer:
      'Los jabones comunes y perfumados son alcalinos y barren a los lactobacilos protectores. Para la higiene externa basta agua tibia o un limpiador suave sin fragancia.',
  },
  {
    id: 'discharge',
    question: '¿Un flujo transparente o ligeramente blanquecino es señal de infección?',
    tag: 'Mito',
    answer:
      '¡Para nada! Un flujo claro, elástico (como clara de huevo en ovulación) o blanco suave sin picazón ni olor fuerte es completamente normal y cambia según tu ciclo.',
  },
  {
    id: 'candida',
    question: 'Si el gel JamaKiss sigue rojo/fucsia, ¿descarta cualquier molestia?',
    tag: 'Dato clave',
    answer:
      'La candidiasis (hongos) mantiene el pH ácido (≤ 4.5), por lo que el gel no cambia de color. Si tienes picazón o flujo grumoso blanco, consulta igual con tu obstetra.',
  },
  {
    id: 'douche',
    question: '¿Hacerse duchas vaginales internas ayuda a "limpiar" mejor?',
    tag: 'Mito',
    answer:
      'La vagina se autolimpia de forma natural gracias a su acidez. Las duchas internas rompen esa barrera protectora y aumentan el riesgo de disbiosis.',
  },
  {
    id: 'postcoital',
    question: '¿Tener relaciones sexuales sin preservativo cambia temporalmente el pH?',
    tag: 'Realidad',
    answer:
      'Sí. El semen tiene un pH alcalino (7.2 – 8.0), por lo que puede oscurecer el gel hacia morado o azul durante 24 horas sin que exista infección.',
  },
];

export interface FlowGlossaryItem {
  id: string;
  title: string;
  appearance: string;
  swatchGradient: string;
  status: 'normal' | 'atencion';
  description: string;
}

export const FLOW_GLOSSARY: FlowGlossaryItem[] = [
  {
    id: 'ovulatorio',
    title: 'Transparente y elástico',
    appearance: 'Similar a clara de huevo',
    swatchGradient: 'from-slate-50 via-white to-sky-50',
    status: 'normal',
    description: 'Moco cervical fértil típico de los días de ovulación. Completamente fisiológico y saludable.',
  },
  {
    id: 'cremoso',
    title: 'Blanco suave o cremoso',
    appearance: 'Homogéneo, sin olor fuerte ni picazón',
    swatchGradient: 'from-stone-50 via-amber-50/40 to-stone-100',
    status: 'normal',
    description: 'Habitual antes o después de la menstruación por cambios normales de progesterona.',
  },
  {
    id: 'grumoso',
    title: 'Blanco espeso / Grumoso',
    appearance: 'Aspecto similar a requesón, con picazón o ardor',
    swatchGradient: 'from-amber-50 via-yellow-50 to-stone-100',
    status: 'atencion',
    description: 'Signo frecuente de candidiasis. Recuerda que suele mantener el pH ácido (fucsia en JamaKiss).',
  },
  {
    id: 'grisaceo',
    title: 'Grisáceo y líquido',
    appearance: 'Acompañado de olor fuerte (similar a pescado)',
    swatchGradient: 'from-slate-200 via-zinc-100 to-slate-300',
    status: 'atencion',
    description: 'Característico de vaginosis bacteriana. Suele virar JamaKiss a vino oscuro o morado (pH > 4.5).',
  },
  {
    id: 'verdoso',
    title: 'Amarillento / Verdoso espumoso',
    appearance: 'Olor marcado, irritación o molestia al orinar',
    swatchGradient: 'from-lime-100 via-emerald-100 to-yellow-100',
    status: 'atencion',
    description: 'Sugiere infección (como tricomoniasis) con pH elevado. Requiere evaluación obstétrica o médica.',
  },
];

export type CenterType = 'publico_sis' | 'privado';

export interface HealthCenter {
  id: string;
  name: string;
  shortTypeLabel: string;
  type: CenterType;
  youthFriendly: boolean;
  district: 'Huánuco' | 'Amarilis' | 'Pillco Marca';
  address: string;
  lat: number;
  lng: number;
  schedule: string;
  services: string[];
  costNote: string;
  phone?: string;
}

export const HUANUCO_DEFAULT_CENTER = {
  lat: -9.9306,
  lng: -76.2422,
  label: 'Huánuco Centro (Plaza de Armas)',
};

export const HUANUCO_HEALTH_CENTERS: HealthCenter[] = [
  {
    id: 'cs-aparicio-pomares',
    name: 'Centro de Salud Aparicio Pomares',
    shortTypeLabel: 'MINSA • Público / SIS',
    type: 'publico_sis',
    youthFriendly: true,
    district: 'Huánuco',
    address: 'Jr. Junín N° 321-323 (Prolongación Junín), Huánuco',
    lat: -9.9278,
    lng: -76.2462,
    schedule: 'Lun–Sáb: 7:30 a.m. – 7:30 p.m.',
    services: ['Obstetricia', 'Atención Diferenciada Juvenil', 'Planificación Familiar', 'Tamizaje ITS'],
    costNote: 'Atención gratuita con SIS / Tarifario MINSA',
  },
  {
    id: 'hospital-valdizan',
    name: 'Hospital Regional Hermilio Valdizán Medrano',
    shortTypeLabel: 'Hospital MINSA • Público / SIS',
    type: 'publico_sis',
    youthFriendly: true,
    district: 'Huánuco',
    address: 'Jr. Hermilio Valdizán N° 950, Huánuco',
    lat: -9.9296,
    lng: -76.2389,
    schedule: 'Consultorios: Lun–Sáb 8:00 a.m. – 1:00 p.m. | Emergencias 24h',
    services: ['Gineco-Obstetricia', 'Emergencias Obstétricas 24h', 'Laboratorio / Cultivos', 'Atención Integral'],
    costNote: 'Gratuito con SIS / Referencia o Emergencia',
  },
  {
    id: 'hospital-showing-ferrari',
    name: 'Hospital Materno Infantil Carlos Showing Ferrari',
    shortTypeLabel: 'Materno Infantil • Público / SIS',
    type: 'publico_sis',
    youthFriendly: true,
    district: 'Amarilis',
    address: 'Av. Micaela Bastidas s/n, Amarilis – Huánuco',
    lat: -9.9372,
    lng: -76.2361,
    schedule: 'Obstetricia: Lun–Sáb 7:30 a.m. – 7:00 p.m. | Emergencias 24h',
    services: ['Especialidad Materno-Infantil', 'Gineco-Obstetricia', 'Consejería Juvenil', 'Control Prenatal'],
    costNote: 'Gratuito con SIS / Atención MINSA',
  },
  {
    id: 'cs-amarilis',
    name: 'Centro de Salud Amarilis',
    shortTypeLabel: 'MINSA • Público / SIS',
    type: 'publico_sis',
    youthFriendly: true,
    district: 'Amarilis',
    address: 'Jr. Miguel Grau N° 216 (a 1 cuadra de la Municipalidad), Amarilis',
    lat: -9.9344,
    lng: -76.2328,
    schedule: 'Lun–Sáb: 7:30 a.m. – 7:00 p.m.',
    services: ['Consultorio de Obstetricia', 'Atención Diferenciada Adolescentes y Jóvenes', 'Planificación Familiar'],
    costNote: 'Gratuito con SIS',
  },
  {
    id: 'cs-peru-corea',
    name: 'Centro de Salud Perú-Corea',
    shortTypeLabel: 'MINSA • Público / SIS',
    type: 'publico_sis',
    youthFriendly: true,
    district: 'Amarilis',
    address: 'Urb. María Luisa s/n, Amarilis, Huánuco',
    lat: -9.9398,
    lng: -76.2292,
    schedule: 'Lun–Sáb: 7:30 a.m. – 7:00 p.m.',
    services: ['Salud Sexual y Reproductiva', 'Obstetricia Preventiva', 'Consejería Confidencial'],
    costNote: 'Gratuito con SIS',
  },
  {
    id: 'cs-potracancha',
    name: 'Centro de Salud Potracancha (Pillco Marca)',
    shortTypeLabel: 'MINSA • Público / SIS',
    type: 'publico_sis',
    youthFriendly: true,
    district: 'Pillco Marca',
    address: 'Jr. San Diego Cdra. 2 s/n – Cayhuayna (cerca a UNHEVAL), Pillco Marca',
    lat: -9.9514,
    lng: -76.2485,
    schedule: 'Lun–Sáb: 7:30 a.m. – 7:00 p.m.',
    services: ['Obstetricia', 'Atención Diferenciada Universitaria/Juvenil', 'Control Preventivo'],
    costNote: 'Gratuito con SIS • Muy cerca de campus UNHEVAL',
  },
  {
    id: 'centro-especializado-mujer',
    name: 'Centro Especializado Mujer',
    shortTypeLabel: 'Clínica Privada Especializada',
    type: 'privado',
    youthFriendly: true,
    district: 'Huánuco',
    address: 'Jr. Huallayco N° 1160, Huánuco Centro',
    lat: -9.9319,
    lng: -76.2408,
    schedule: 'Lun–Sáb: 8:30 a.m. – 7:30 p.m. (previa cita)',
    services: ['Ginecología y Obstetricia', 'Ecografías', 'Examen en Fresco / Papanicolaou', 'Salud Femenina Integral'],
    costNote: 'Consulta privada',
  },
  {
    id: 'consultorio-jyza',
    name: 'Consultorio Gineco-Obstétrico JYZA',
    shortTypeLabel: 'Consultorio Privado',
    type: 'privado',
    youthFriendly: false,
    district: 'Huánuco',
    address: 'Jr. Dos de Mayo N° 1600 (esq. Jr. Pedro Puelles), Huánuco',
    lat: -9.9336,
    lng: -76.2449,
    schedule: 'Lun–Sáb: 9:00 a.m. – 7:00 p.m.',
    services: ['Ginecología', 'Obstetricia', 'Control de Flora e Infecciones'],
    costNote: 'Consulta privada',
  },
  {
    id: 'clinica-hidalgo',
    name: 'Clínica Hidalgo',
    shortTypeLabel: 'Clínica Privada',
    type: 'privado',
    youthFriendly: false,
    district: 'Amarilis',
    address: 'Urb. Leoncio Prado, Calle 8 Mz. H Lote 4, Amarilis',
    lat: -9.9363,
    lng: -76.2305,
    schedule: 'Lun–Dom: 8:00 a.m. – 8:00 p.m.',
    services: ['Gineco-Obstetricia', 'Laboratorio Clínico', 'Atención Particular'],
    costNote: 'Consulta privada',
  },
  {
    id: 'consultorio-femvida',
    name: 'Consultorio Gineco-Obstétrico FemVida',
    shortTypeLabel: 'Consultorio Privado',
    type: 'privado',
    youthFriendly: true,
    district: 'Huánuco',
    address: 'Av. Alfonso Ugarte N° 751, Huánuco',
    lat: -9.9347,
    lng: -76.2471,
    schedule: 'Lun–Sáb: 9:00 a.m. – 6:30 p.m.',
    services: ['Ginecología y Obstetricia', 'Orientación Juvenil y Planificación'],
    costNote: 'Consulta privada',
  },
];

export const PRE_APPOINTMENT_TIPS = [
  {
    title: 'Sin duchas vaginales ni jabones fuertes',
    detail: 'Evita duchas vaginales o jabones íntimos perfumados al menos 24 horas antes de tu cita para no alterar la muestra.',
  },
  {
    title: 'No apliques óvulos ni cremas antes del examen',
    detail: 'Evita automedicarte antes de que la obstetra o médica evalúe el flujo real y confirme la causa exacta.',
  },
  {
    title: 'Ten a mano tu Fecha de Última Menstruación (FUM)',
    detail: 'Siempre se solicita en la historia clínica obstétrica para interpretar mejor tus síntomas y tu ciclo.',
  },
];

