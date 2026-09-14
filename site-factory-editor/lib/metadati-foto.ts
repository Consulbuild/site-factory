// Metadati delle foto JPEG, funzioni pure (niente I/O): leggono l'orientamento EXIF e
// tolgono i metadati (EXIF con GPS, XMP, IPTC, commenti) senza ricodificare i pixel.
// La pipeline che le usa, con la rotazione via `sips`, è `pulisciJpeg` in lib/lavori.ts:
// la usano l'import del form lead, l'upload delle foto lavori e il mini-form di T3
// (docs/traffico/piano-T3.md §6).

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;

export const eJpeg = (buf: Uint8Array): boolean => buf[0] === 0xff && buf[1] === SOI && buf[2] === 0xff;

const testo = (buf: Buffer, da: number, n: number) => buf.toString("latin1", da, da + n);

function inizio(buf: Buffer): void {
  if (!eJpeg(buf)) throw new Error("il file non è un JPEG");
}

/** Lunghezza del segmento che inizia a `i` (marker incluso), controllata sul buffer. */
function lunghezza(buf: Buffer, i: number): number {
  if (i + 4 > buf.length) throw new Error("JPEG troncato");
  const n = 2 + buf.readUInt16BE(i + 2);
  if (n < 4 || i + n > buf.length) throw new Error("JPEG troncato");
  return n;
}

/** Fine dei dati compressi di una scansione: il primo marker vero (non stuffing, non RST). */
function fineScansione(buf: Buffer, da: number): number {
  for (let j = da; j + 1 < buf.length; j++) {
    if (buf[j] !== 0xff) continue;
    const m = buf[j + 1];
    if (m !== 0x00 && m !== 0xff && !(m >= 0xd0 && m <= 0xd7)) return j;
  }
  throw new Error("JPEG troncato: manca la fine dell'immagine");
}

/**
 * Orientamento EXIF 1..8 (tag 0x0112 in IFD0); 1 se manca, non è valido o l'IFD è
 * rovinato (come la mostrano i browser). File non JPEG o segmenti troncati → eccezione.
 */
export function orientamentoExif(buf: Buffer): number {
  inizio(buf);
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) throw new Error("JPEG malformato");
    const m = buf[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === SOS || m === EOI) return 1; // l'EXIF sta prima dell'immagine
    const n = lunghezza(buf, i);
    if (m === 0xe1 && testo(buf, i + 4, 6) === "Exif\0\0") {
      const tiff = buf.subarray(i + 10, i + n);
      const le = testo(tiff, 0, 2) === "II";
      const u16 = (o: number) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
      try {
        const ifd = le ? tiff.readUInt32LE(4) : tiff.readUInt32BE(4);
        for (let k = 0, voci = u16(ifd); k < voci; k++) {
          const e = ifd + 2 + k * 12;
          if (u16(e) !== 0x0112) continue;
          const o = u16(e + 8);
          return o >= 1 && o <= 8 ? o : 1;
        }
      } catch {
        // puntatori fuori dal segmento: EXIF illeggibile anche per i browser
      }
      return 1;
    }
    i += n;
  }
  throw new Error("JPEG troncato");
}

/**
 * Lo stesso JPEG senza metadati: restano APP0 (JFIF), APP2 del profilo colore ICC e
 * APP14 Adobe (serve a leggere i colori); via APP1 (EXIF, XMP), APP2 MPF, APP3-APP13,
 * APP15, commenti e tutto ciò che segue la fine dell'immagine (le immagini secondarie
 * MPF portano il loro EXIF). I dati compressi restano byte per byte. Malformato → eccezione.
 */
export function senzaMetadati(buf: Buffer): Buffer {
  inizio(buf);
  const parti: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) throw new Error("JPEG malformato");
    const m = buf[i + 1];
    if (m === 0xff) { i++; continue; } // byte di riempimento tra i segmenti
    if (m === EOI) {
      parti.push(buf.subarray(i, i + 2));
      return Buffer.concat(parti);
    }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { // marker senza lunghezza
      parti.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const n = lunghezza(buf, i);
    if (m === SOS) {
      const fine = fineScansione(buf, i + n);
      parti.push(buf.subarray(i, fine));
      i = fine;
      continue;
    }
    const tieni =
      !(m >= 0xe0 && m <= 0xef) && m !== 0xfe
        ? true // tabelle e frame
        : m === 0xe0 || (m === 0xe2 && testo(buf, i + 4, 12) === "ICC_PROFILE\0") || (m === 0xee && testo(buf, i + 4, 5) === "Adobe");
    if (tieni) parti.push(buf.subarray(i, i + n));
    i += n;
  }
  throw new Error("JPEG troncato: manca la fine dell'immagine");
}
