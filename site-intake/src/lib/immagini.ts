/**
 * Ispezione leggera delle immagini scelte dal lead, senza decodificarle per intero:
 * formato (HEIC arrivato di nascosto), dimensioni in pixel lette dall'intestazione
 * (JPEG/PNG/WebP) per l'avviso «foto piccola», e una miniatura da 240 px per la
 * griglia. Le foto originali NON si toccano: partono così come sono
 * (docs/ricerca-storage-foto-lead-2026-09.md §2 bis).
 */
export interface Ispezione {
  heic: boolean;
  larghezza?: number;
  altezza?: number;
}

const TESTA_BYTES = 512 * 1024; // gli EXIF con anteprima possono spingere il marker SOF oltre i 64 KB

async function leggiTesta(file: File): Promise<DataView> {
  const buf = await file.slice(0, TESTA_BYTES).arrayBuffer();
  return new DataView(buf);
}

const ascii = (dv: DataView, da: number, n: number) => {
  let s = "";
  for (let i = 0; i < n && da + i < dv.byteLength; i++) s += String.fromCharCode(dv.getUint8(da + i));
  return s;
};

export function eHeic(dv: DataView): boolean {
  if (dv.byteLength < 12) return false;
  if (ascii(dv, 4, 4) !== "ftyp") return false;
  const brand = ascii(dv, 8, 4);
  return ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heif"].includes(brand);
}

function dimensioniJpeg(dv: DataView): { w: number; h: number } | null {
  if (dv.byteLength < 4 || dv.getUint16(0) !== 0xffd8) return null;
  let i = 2;
  while (i + 9 < dv.byteLength) {
    if (dv.getUint8(i) !== 0xff) {
      i++;
      continue;
    }
    const marker = dv.getUint8(i + 1);
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = dv.getUint16(i + 2);
    const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (sof) return { h: dv.getUint16(i + 5), w: dv.getUint16(i + 7) };
    i += 2 + len;
  }
  return null;
}

function dimensioniPng(dv: DataView): { w: number; h: number } | null {
  if (dv.byteLength < 24 || ascii(dv, 1, 3) !== "PNG") return null;
  return { w: dv.getUint32(16), h: dv.getUint32(20) };
}

function dimensioniWebp(dv: DataView): { w: number; h: number } | null {
  if (dv.byteLength < 30 || ascii(dv, 0, 4) !== "RIFF" || ascii(dv, 8, 4) !== "WEBP") return null;
  const tipo = ascii(dv, 12, 4);
  if (tipo === "VP8X") {
    const w = 1 + (dv.getUint8(24) | (dv.getUint8(25) << 8) | (dv.getUint8(26) << 16));
    const h = 1 + (dv.getUint8(27) | (dv.getUint8(28) << 8) | (dv.getUint8(29) << 16));
    return { w, h };
  }
  if (tipo === "VP8 ") return { w: dv.getUint16(26, true) & 0x3fff, h: dv.getUint16(28, true) & 0x3fff };
  if (tipo === "VP8L") {
    const b1 = dv.getUint8(21);
    const b2 = dv.getUint8(22);
    const b3 = dv.getUint8(23);
    const b4 = dv.getUint8(24);
    return { w: 1 + (b1 | ((b2 & 0x3f) << 8)), h: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)) };
  }
  return null;
}

export async function ispeziona(file: File): Promise<Ispezione> {
  try {
    const dv = await leggiTesta(file);
    if (eHeic(dv)) return { heic: true };
    const d = dimensioniJpeg(dv) ?? dimensioniPng(dv) ?? dimensioniWebp(dv);
    return d ? { heic: false, larghezza: d.w, altezza: d.h } : { heic: false };
  } catch {
    return { heic: false };
  }
}

/**
 * Miniatura da 240 px (URL blob da revocare). Usa createImageBitmap con
 * ridimensionamento nel decoder: non si decodifica mai la foto intera in memoria
 * (48 MB per una da 12 MP, la causa dei ricaricamenti nel browser di Instagram).
 */
export async function miniatura(file: File, larghezza = 240): Promise<string | null> {
  if (typeof createImageBitmap !== "function") return null;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { resizeWidth: larghezza, resizeQuality: "low", imageOrientation: "from-image" });
  } catch {
    try {
      bmp = await createImageBitmap(file, { resizeWidth: larghezza, resizeQuality: "low" });
    } catch {
      return null;
    }
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext("2d")?.drawImage(bmp, 0, 0);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}
