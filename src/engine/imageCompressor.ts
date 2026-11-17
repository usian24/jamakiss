export interface CompressedImagePayload {
  dataUrl: string;
  base64: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  originalKB: number;
  compressedKB: number;
  savingsPercent: number;
}

/**
 * Comprime y redimensiona una imagen usando decodificación acelerada por GPU
 * (createImageBitmap + OffscreenCanvas/Canvas) antes de enviarla a Gemini 2.5 Flash.
 * Objetivo: máximo 512px en su lado mayor y JPEG 0.72 (~15–35 KB) para ahorrar >95% de tokens
 * manteniendo fidelidad cromática real de las antocianinas de flor de Jamaica.
 */
export async function compressImageForVision(
  file: File,
  maxDimension = 512,
  quality = 0.72
): Promise<CompressedImagePayload> {
  const originalKB = Math.max(1, Math.round(file.size / 1024));

  // Decodificación acelerada por hardware cuando el navegador soporta createImageBitmap
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    try {
      const ratio = Math.min(maxDimension / bitmap.width, maxDimension / bitmap.height, 1);
      const targetW = Math.max(64, Math.round(bitmap.width * ratio));
      const targetH = Math.max(64, Math.round(bitmap.height * ratio));

      let blob: Blob | null = null;

      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(targetW, targetH);
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(bitmap, 0, 0, targetW, targetH);
          blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality });
        }
      }

      if (!blob) {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D no disponible');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        return buildPayload(dataUrl, targetW, targetH, originalKB);
      }

      const dataUrl = await blobToDataUrl(blob);
      return buildPayload(dataUrl, targetW, targetH, originalKB);
    } finally {
      bitmap.close();
    }
  }

  // Fallback clásico basado en HTMLImageElement + Canvas
  const rawUrl = await blobToDataUrl(file);
  const img = await loadImage(rawUrl);
  const ratio = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
  const targetW = Math.max(64, Math.round(img.width * ratio));
  const targetH = Math.max(64, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  return buildPayload(dataUrl, targetW, targetH, originalKB);
}

function buildPayload(
  dataUrl: string,
  width: number,
  height: number,
  originalKB: number
): CompressedImagePayload {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const compressedBytes = Math.ceil((base64.length * 3) / 4);
  const compressedKB = Math.max(1, Math.round(compressedBytes / 1024));
  const savingsPercent = Math.max(0, Math.min(99, Math.round((1 - compressedKB / Math.max(originalKB, compressedKB)) * 100)));

  return {
    dataUrl,
    base64,
    mimeType: 'image/jpeg',
    width,
    height,
    originalKB,
    compressedKB,
    savingsPercent,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Error leyendo imagen'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Error decodificando imagen'));
    img.src = src;
  });
}

