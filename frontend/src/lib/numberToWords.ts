/**
 * Converts a number to its Spanish words representation for currency amounts.
 * Example: 54.00 -> "CINCUENTA Y CUATRO CON 00/100 SOLES"
 */
export function numberToSpanishWords(amount: number): string {
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCHIENTOS', 'NOVECIENTOS'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';

    let output = '';
    const h = Math.floor(n / 100);
    const r = n % 100;
    const t = Math.floor(r / 10);
    const u = r % 10;

    if (h > 0) output += hundreds[h] + ' ';

    if (r >= 10 && r < 20) {
      output += teens[r - 10];
    } else if (r >= 20 && r < 30) {
      output += u === 0 ? 'VEINTE' : `VEINTI${units[u]}`;
    } else {
      if (t > 0) output += tens[t] + (u > 0 ? ' Y ' : '');
      if (u > 0) output += units[u];
    }

    return output.trim();
  }

  const intPart = Math.floor(Math.abs(amount));
  const decPart = Math.round((Math.abs(amount) - intPart) * 100);
  const centsStr = String(decPart).padStart(2, '0');

  if (intPart === 0) {
    return `CERO CON ${centsStr}/100 SOLES`;
  }

  let words = '';
  const thousands = Math.floor(intPart / 1000);
  const remainder = intPart % 1000;

  if (thousands > 0) {
    if (thousands === 1) {
      words += 'MIL ';
    } else {
      words += convertGroup(thousands) + ' MIL ';
    }
  }

  if (remainder > 0) {
    words += convertGroup(remainder);
  }

  return `${words.trim()} CON ${centsStr}/100 SOLES`;
}
