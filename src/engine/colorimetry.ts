import { PH_ZONES, PhColorZone, PhZoneId } from '../data/jamakissData';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export interface ColorimetryResult {
  zone: PhColorZone;
  rawRgb: RGB;
  calibratedRgb: RGB;
  hex: string;
  deltaE: number;
  confidence: number; // 0 - 100
  whiteBalanced: boolean;
  zoneScores: Array<{ zoneId: PhZoneId; deltaE: number; label: string }>;
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/**
 * Conversión estándar sRGB -> XYZ (D65) -> CIE L*a*b*
 * Permite medir distancia perceptual real (Delta E) mucho más precisa que RGB puro.
 */
export function rgbToLab({ r, g, b }: RGB): Lab {
  const linearize = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  const rl = linearize(r);
  const gl = linearize(g);
  const bl = linearize(b);

  // sRGB D65 matrix
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) / 1.0;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * Distancia perceptual ponderada en CIE Lab:
 * Da ligeramente mayor peso a los ejes cromáticos (a*, b*) que a la luminosidad (L*)
 * para ser más resiliente a sombras en fotos tomadas con celular.
 */
export function weightedDeltaE(lab1: Lab, lab2: Lab): number {
  const dL = (lab1.L - lab2.L) * 0.65;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Corrección de balance de blancos tipo Von Kries usando una muestra del fondo blanco
 * (hoja blanca o portaobjetos sobre papel blanco).
 */
export function applyWhiteBalance(sample: RGB, whiteRef: RGB | null): RGB {
  if (!whiteRef) return sample;
  const target = 242; // Blanco papel bajo luz neutra
  const safe = (v: number) => Math.max(40, v);
  const gainR = Math.min(2.2, Math.max(0.55, target / safe(whiteRef.r)));
  const gainG = Math.min(2.2, Math.max(0.55, target / safe(whiteRef.g)));
  const gainB = Math.min(2.2, Math.max(0.55, target / safe(whiteRef.b)));

  return {
    r: Math.min(255, Math.max(0, Math.round(sample.r * gainR))),
    g: Math.min(255, Math.max(0, Math.round(sample.g * gainG))),
    b: Math.min(255, Math.max(0, Math.round(sample.b * gainB))),
  };
}

/**
 * Clasifica un RGB extraído de la gota de gel JamaKiss contra la escala de antocianinas.
 */
export function classifyJamaKissColor(rawRgb: RGB, whiteRef: RGB | null = null): ColorimetryResult {
  const calibratedRgb = applyWhiteBalance(rawRgb, whiteRef);
  const sampleLab = rgbToLab(calibratedRgb);

  const scores = PH_ZONES.map((zone) => {
    const distances = zone.referenceHexes.map((hex) => weightedDeltaE(sampleLab, rgbToLab(hexToRgb(hex))));
    const minDelta = Math.min(...distances);
    return { zone, deltaE: minDelta };
  });

  scores.sort((a, b) => a.deltaE - b.deltaE);
  const best = scores[0];
  const second = scores[1];

  // Confianza basada en cercanía absoluta y margen frente a la segunda zona
  const closeness = Math.max(0, Math.min(1, 1 - best.deltaE / 75));
  const separation = Math.max(0, Math.min(1, (second.deltaE - best.deltaE) / 25));
  const confidence = Math.round(Math.max(42, Math.min(99, (closeness * 0.72 + separation * 0.28) * 100)));

  return {
    zone: best.zone,
    rawRgb,
    calibratedRgb,
    hex: rgbToHex(calibratedRgb),
    deltaE: Math.round(best.deltaE * 10) / 10,
    confidence,
    whiteBalanced: Boolean(whiteRef),
    zoneScores: scores.map((s) => ({
      zoneId: s.zone.id,
      deltaE: Math.round(s.deltaE * 10) / 10,
      label: s.zone.shortLabel,
    })),
  };
}

/**
 * Muestrea una región circular de radio `radiusPx` alrededor de (cx, cy) en un Canvas
 * usando mediana recortada para descartar reflejos especulares blancos del gel.
 */
export function sampleCanvasRegion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radiusPx = 10
): RGB {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const x0 = Math.max(0, Math.floor(cx - radiusPx));
  const y0 = Math.max(0, Math.floor(cy - radiusPx));
  const sw = Math.min(w - x0, radiusPx * 2 + 1);
  const sh = Math.min(h - y0, radiusPx * 2 + 1);

  const data = ctx.getImageData(x0, y0, Math.max(1, sw), Math.max(1, sh)).data;
  const pixels: Array<{ r: number; g: number; b: number; lum: number }> = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    pixels.push({ r, g, b, lum });
  }

  if (pixels.length === 0) return { r: 230, g: 0, b: 92 };

  // Ordenar por luminosidad y descartar el 20% más brillante (reflejos del flash/luz en el gel)
  pixels.sort((a, b) => a.lum - b.lum);
  const start = Math.floor(pixels.length * 0.1);
  const end = Math.max(start + 1, Math.floor(pixels.length * 0.8));
  const slice = pixels.slice(start, end);

  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (const p of slice) {
    sr += p.r;
    sg += p.g;
    sb += p.b;
  }

  return {
    r: Math.round(sr / slice.length),
    g: Math.round(sg / slice.length),
    b: Math.round(sb / slice.length),
  };
}

/**
 * Busca automáticamente el punto central más pigmentado (gota de gel) y una esquina clara (fondo blanco)
 * al cargar una nueva fotografía.
 */
export function autoDetectDropAndBackground(canvas: HTMLCanvasElement): {
  dropPoint: { x: number; y: number };
  bgPoint: { x: number; y: number } | null;
} {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dropPoint: { x: canvas.width / 2, y: canvas.height / 2 }, bgPoint: null };

  const w = canvas.width;
  const h = canvas.height;
  const step = Math.max(4, Math.floor(Math.min(w, h) / 48));

  let bestScore = -1;
  let bestX = Math.floor(w / 2);
  let bestY = Math.floor(h / 2);

  let brightestScore = -1;
  let bgX = Math.floor(w * 0.12);
  let bgY = Math.floor(h * 0.12);

  const img = ctx.getImageData(0, 0, w, h).data;

  for (let y = Math.floor(h * 0.15); y < Math.floor(h * 0.85); y += step) {
    for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.85); x += step) {
      const idx = (y * w + x) * 4;
      const r = img[idx];
      const g = img[idx + 1];
      const b = img[idx + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const darkness = 1 - (r + g + b) / (3 * 255);

      // Preferencia suave hacia el centro de la foto + color pigmentado (fucsia, vino, morado, azul pizarra)
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const centerWeight = Math.max(0.25, 1 - Math.sqrt(dx * dx + dy * dy) * 0.6);

      const score = (sat * 1.4 + darkness * 0.9) * centerWeight;
      if (score > bestScore && max > 25 && min < 220) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  // Buscar zona más neutra y brillante cerca de los bordes para referencia de fondo blanco
  const borderSamples: Array<[number, number]> = [
    [w * 0.1, h * 0.1],
    [w * 0.9, h * 0.1],
    [w * 0.1, h * 0.9],
    [w * 0.9, h * 0.9],
    [w * 0.5, h * 0.08],
    [w * 0.5, h * 0.92],
  ];

  for (const [bx, by] of borderSamples) {
    const ix = Math.floor(bx);
    const iy = Math.floor(by);
    const idx = (iy * w + ix) * 4;
    const r = img[idx];
    const g = img[idx + 1];
    const b = img[idx + 2];
    const lum = (r + g + b) / 3;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const whiteScore = lum - spread * 2;
    if (lum > 175 && spread < 40 && whiteScore > brightestScore) {
      brightestScore = whiteScore;
      bgX = ix;
      bgY = iy;
    }
  }

  return {
    dropPoint: { x: bestX, y: bestY },
    bgPoint: brightestScore > 140 ? { x: bgX, y: bgY } : null,
  };
}

