// Banco di prova delle foto senza metadati (lib/metadati-foto.ts e normalizeToJpg di
// lib/lavori.ts): nessuna rete, nessun binario in git. Genera con `sips` una JPEG a
// quadranti colorati, le inietta EXIF con GPS e orientamento 1..8, XMP con GPS, IPTC,
// commento, MPF, profilo ICC e byte dopo la fine, e controlla che la foto salvata sia
// dritta (ruotata una sola volta) e senza metadati.
//
//   cd site-factory-editor && node --experimental-strip-types scripts/test-metadati-foto.ts
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { orientamentoExif, senzaMetadati } from "../lib/metadati-foto.ts";
import { normalizeToJpg } from "../lib/lavori.ts";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sf-metadati-"));
const f = (nome: string) => path.join(tmp, nome);
function sips(...args: string[]): string {
  const r = spawnSync("sips", args, { encoding: "utf8" });
  assert.equal(r.status, 0, `sips ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
}
const segmento = (marker: number, corpo: Buffer) => {
  const s = Buffer.from([0xff, marker, 0, 0]);
  s.writeUInt16BE(corpo.length + 2, 2);
  return Buffer.concat([s, corpo]);
};

/** Segmenti APPn/COM prima dell'immagine, dati compressi (SOS→EOI) e byte dopo l'EOI. */
function struttura(buf: Buffer) {
  const app: string[] = [];
  let i = 2;
  while (buf[i + 1] !== 0xda) {
    const m = buf[i + 1];
    if ((m >= 0xe0 && m <= 0xef) || m === 0xfe) app.push(`${m.toString(16)}:${buf.toString("latin1", i + 4, i + 8)}`);
    i += 2 + buf.readUInt16BE(i + 2);
  }
  const eoi = buf.lastIndexOf(Buffer.from([0xff, 0xd9]));
  return { app, dati: buf.subarray(i, eoi + 2), coda: buf.length - eoi - 2 };
}

/** Colori degli angoli come la foto si vede (via BMP di sips): alto-sx, alto-dx, basso-sx, basso-dx. */
function quadranti(file: string): { dim: string; colori: string } {
  sips("-s", "format", "bmp", file, "--out", file + ".bmp");
  const b = fs.readFileSync(file + ".bmp");
  const off = b.readUInt32LE(10), W = b.readInt32LE(18), hFirmata = b.readInt32LE(22), H = Math.abs(hFirmata);
  const bpp = b.readUInt16LE(28) / 8, riga = Math.ceil((W * bpp) / 4) * 4;
  const colore = (x: number, y: number) => {
    const o = off + (hFirmata > 0 ? H - 1 - y : y) * riga + x * bpp;
    const [bl, g, r] = [b[o], b[o + 1], b[o + 2]];
    return r > 200 && g > 200 && bl > 200 ? "W" : r > 150 && g < 100 ? "R" : g > 150 && r < 100 ? "G" : bl > 150 && r < 100 ? "B" : "?";
  };
  const [x1, x2, y1, y2] = [W >> 2, (3 * W) >> 2, H >> 2, (3 * H) >> 2];
  return { dim: `${W}x${H}`, colori: colore(x1, y1) + colore(x2, y1) + colore(x1, y2) + colore(x2, y2) };
}

// Come si vede la foto R G / B W per ogni orientamento EXIF (definizioni TIFF 6.0).
const ATTESO: Record<number, string> = { 1: "RGBW", 2: "GRWB", 3: "WBGR", 4: "BWRG", 5: "RBGW", 6: "BRWG", 7: "WGBR", 8: "GWRB" };

/** APP1 Exif con Orientation e un IFD GPS (latitudine 45°30' N), big o little endian. */
function exif(orientamento: number, le: boolean): Buffer {
  const t = Buffer.alloc(92);
  const u16 = (v: number, o: number) => (le ? t.writeUInt16LE(v, o) : t.writeUInt16BE(v, o));
  const u32 = (v: number, o: number) => (le ? t.writeUInt32LE(v, o) : t.writeUInt32BE(v, o));
  t.write(le ? "II" : "MM");
  u16(42, 2), u32(8, 4), u16(2, 8);
  u16(0x0112, 10), u16(3, 12), u32(1, 14), u16(orientamento, 18); // Orientation
  u16(0x8825, 22), u16(4, 24), u32(1, 26), u32(38, 30), u32(0, 34); // → IFD GPS
  u16(2, 38);
  u16(1, 40), u16(2, 42), u32(2, 44), t.write("N\0", 48); // GPSLatitudeRef
  u16(2, 52), u16(5, 54), u32(3, 56), u32(68, 60), u32(0, 64); // GPSLatitude
  [45, 1, 30, 1, 0, 1].forEach((v, k) => u32(v, 68 + k * 4));
  return segmento(0xe1, Buffer.concat([Buffer.from("Exif\0\0", "latin1"), t]));
}

let ok = false;
try {
  // Immagine 160×80 a quadranti (R G / B W) in BMP → JPEG con sips, senza i segmenti di sips.
  const [W, H] = [160, 80];
  const riga = W * 3 + ((4 - ((W * 3) % 4)) % 4);
  const px = Buffer.alloc(riga * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [r, g, b] = y < H / 2 ? (x < W / 2 ? [255, 0, 0] : [0, 255, 0]) : x < W / 2 ? [0, 0, 255] : [255, 255, 255];
      px.set([b, g, r], (H - 1 - y) * riga + x * 3);
    }
  const bmp = Buffer.alloc(54);
  bmp.write("BM"), bmp.writeUInt32LE(54 + px.length, 2), bmp.writeUInt32LE(54, 10), bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(W, 18), bmp.writeInt32LE(H, 22), bmp.writeUInt16LE(1, 26), bmp.writeUInt16LE(24, 28), bmp.writeUInt32LE(px.length, 34);
  fs.writeFileSync(f("base.bmp"), Buffer.concat([bmp, px]));
  sips("-s", "format", "jpeg", f("base.bmp"), "--out", f("base.jpg"));
  const base = fs.readFileSync(f("base.jpg"));
  let i = 2;
  const app0: Buffer[] = [];
  while (base[i + 1] >= 0xe0 && base[i + 1] <= 0xef) {
    const n = 2 + base.readUInt16BE(i + 2);
    if (base[i + 1] === 0xe0) app0.push(base.subarray(i, i + n));
    i += n;
  }
  const immagine = base.subarray(i); // tabelle, frame, scansione, EOI
  const icc = fs.readFileSync("/System/Library/ColorSync/Profiles/Display P3.icc");
  const sporca = (o: number, le = false) =>
    Buffer.concat([
      base.subarray(0, 2),
      ...app0,
      exif(o, le),
      segmento(0xe1, Buffer.from("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta><exif:GPSLatitude>45,30N</exif:GPSLatitude></x:xmpmeta>", "latin1")),
      segmento(0xed, Buffer.from("Photoshop 3.0\x008BIM", "latin1")),
      segmento(0xfe, Buffer.from("scattata in via Roma 1", "latin1")),
      segmento(0xe2, Buffer.from("MPF\0MM\0*", "latin1")),
      segmento(0xe2, Buffer.concat([Buffer.from("ICC_PROFILE\0\x01\x01", "latin1"), icc])),
      immagine,
      Buffer.from("CODA-DOPO-EOI"),
    ]);
  for (let o = 1; o <= 8; o++) fs.writeFileSync(f(`o${o}.jpg`), sporca(o));
  // Byte spuri tra due segmenti: i decoder li tollerano, il nostro parser no.
  const o1 = sporca(1), dopoApp0 = 2 + app0.reduce((n, s) => n + s.length, 0);
  fs.writeFileSync(f("irregolare.jpg"), Buffer.concat([o1.subarray(0, dopoApp0), Buffer.alloc(3), o1.subarray(dopoApp0)]));

  // 1. senzaMetadati: restano JFIF e profilo ICC, pixel compressi identici, niente coda.
  const s6 = sporca(6);
  const pulita = senzaMetadati(s6);
  const st = struttura(pulita);
  assert.deepEqual(st.app, ["e0:JFIF", "e2:ICC_"], "restano solo APP0 e APP2 ICC");
  assert.ok(st.dati.equals(struttura(s6).dati), "dati compressi byte per byte");
  assert.equal(st.coda, 0, "niente dopo la fine dell'immagine");
  assert.ok(senzaMetadati(pulita).equals(pulita), "idempotente");
  fs.writeFileSync(f("pulita.jpg"), pulita);
  assert.match(sips("-g", "pixelWidth", f("pulita.jpg")), /pixelWidth: 160/);
  console.log("✓ senzaMetadati: via EXIF/GPS, XMP, IPTC, commento, MPF e coda; ICC e pixel intatti");

  // 2. orientamentoExif: II e MM, assente, file non JPEG o troncati.
  for (let o = 1; o <= 8; o++) {
    assert.equal(orientamentoExif(sporca(o)), o, `MM ${o}`);
    assert.equal(orientamentoExif(sporca(o, true)), o, `II ${o}`);
  }
  assert.equal(orientamentoExif(pulita), 1, "senza EXIF → 1");
  const rotto = Buffer.from(s6);
  rotto.writeUInt32BE(9999, rotto.indexOf("Exif\0\0") + 10); // IFD0 fuori dal segmento
  assert.equal(orientamentoExif(rotto), 1, "EXIF rovinato → 1");
  sips("-s", "format", "png", f("base.bmp"), "--out", f("base.png"));
  assert.throws(() => orientamentoExif(fs.readFileSync(f("base.png"))), /non è un JPEG/);
  assert.throws(() => orientamentoExif(s6.subarray(0, 60)), /troncato/);
  assert.throws(() => senzaMetadati(s6.subarray(0, s6.length - 200)), /troncato/);
  console.log("✓ orientamentoExif: 1..8 in II e MM, 1 senza EXIF, eccezione su PNG e JPEG troncato");

  // 3. normalizeToJpg: dritta una sola volta e senza metadati, da JPEG, HEIC e con ridimensionamento.
  sips("-s", "format", "heic", f("o6.jpg"), "--out", f("o6.heic"));
  const casi: { src: string; o: number; maxLato?: number; dim: string }[] = [
    ...Object.keys(ATTESO).map((k) => ({ src: `o${k}.jpg`, o: Number(k), dim: Number(k) >= 5 ? "80x160" : "160x80" })),
    { src: "o6.heic", o: 6, dim: "80x160" },
    { src: "o6.jpg", o: 6, maxLato: 80, dim: "40x80" },
    { src: "irregolare.jpg", o: 1, maxLato: Infinity, dim: "160x80" },
  ];
  for (const c of casi) {
    const nome = `${c.src}-${c.maxLato ?? "max"}`;
    const out = f(`${nome}.out.jpg`);
    assert.equal(quadranti(f(c.src)).colori, ATTESO[c.o], `${nome}: la sorgente si vede come atteso`);
    normalizeToJpg(f(c.src), out, c.maxLato);
    const buf = fs.readFileSync(out);
    assert.ok(!struttura(buf).app.some((a) => a.startsWith("e1:")), `${nome}: nessun APP1 Exif/XMP`);
    assert.ok(senzaMetadati(buf).equals(buf), `${nome}: zero metadati`);
    assert.deepEqual(quadranti(out), { dim: c.dim, colori: ATTESO[c.o] }, `${nome}: dimensioni e verso`);
  }
  const src1 = fs.readFileSync(f("o1.jpg"));
  assert.ok(struttura(fs.readFileSync(f("o1.jpg-max.out.jpg"))).dati.equals(struttura(src1).dati), "JPEG dritto e piccolo: nessuna ricodifica");
  console.log("✓ normalizeToJpg: orientamenti 1..8, HEIC e ridimensionata → dritta, dimensioni ruotate, zero metadati");
  ok = true;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
  if (!ok) process.exitCode = 1;
}
