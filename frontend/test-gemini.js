const k = process.env.VITE_GEMINI_API_KEY || '';
const p = `quiero que me digas los precios en perú de una motocicleta honda navi y los links de 3 tiendas

IMPORTANTE: Los links deben ser URLs REALES que existan y lleven directamente al producto o a la tienda. NO inventes URLs.

Responde SOLAMENTE con un objeto JSON válido, sin explicaciones, sin backticks, sin markdown:
{"summary":"resumen de precios","stores":[{"storeName":"nombre real de la tienda","pricePEN":5000,"priceUSD":1300,"url":"https://url-real-del-producto","notes":"nota breve"}]}

- pricePEN en soles peruanos
- priceUSD solo si el precio original es en dólares (tipo de cambio 3.75)
- Ordena de menor a mayor precio
- Los URLs deben ser páginas reales donde se vende el producto`;

function extractJsonObject(text) {
  let cleaned = text.replace(/\`\`\`json\s*/gi, '').replace(/\`\`\`\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) { try { return JSON.parse(cleaned.substring(start, i+1)); } catch { return null; } } }
  }
  return null;
}

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${k}`,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    contents:[{parts:[{text:p}]}],
    generationConfig:{temperature:0.1,maxOutputTokens:2048}
  })
}).then(r=>r.json()).then(d=>{
  const parts = d.candidates[0].content.parts;
  let fullText = '';
  parts.forEach(p => { if(p.text) fullText += p.text; });
  
  console.log('=== RAW TEXT (first 300 chars) ===');
  console.log(fullText.substring(0,300));
  console.log('\n=== EXTRACTED JSON ===');
  const json = extractJsonObject(fullText);
  if (json) {
    console.log(JSON.stringify(json, null, 2));
    console.log('\n=== URLS ===');
    json.stores.forEach(s => console.log(`${s.storeName}: ${s.url}`));
  } else {
    console.log('NO JSON FOUND');
    console.log('Full text:', fullText);
  }
}).catch(e=>console.error(e));
