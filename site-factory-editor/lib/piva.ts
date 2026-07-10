/**
 * Checksum partita IVA italiana (11 cifre, algoritmo di controllo standard):
 * cifre in posizione dispari sommate, cifre in posizione pari raddoppiate
 * (−9 se >9); l'11ª cifra è (10 − somma mod 10) mod 10.
 * Deterministico: nessuna AI, nessuna chiamata esterna.
 */
export function pivaValida(piva: string): boolean {
  const s = piva.replace(/\s/g, "");
  if (!/^\d{11}$/.test(s)) return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    const d = s.charCodeAt(i) - 48;
    if (i % 2 === 0) somma += d; // posizioni dispari (1-indexed)
    else somma += d * 2 > 9 ? d * 2 - 9 : d * 2;
  }
  return (10 - (somma % 10)) % 10 === s.charCodeAt(10) - 48;
}
