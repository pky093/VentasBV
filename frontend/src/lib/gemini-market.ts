// Gemini API Service for Market Price Consultation
// Uses gemini-3.5-flash for quality URLs, with robust JSON extraction

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
];

function getApiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

export interface MarketResult {
  storeName: string;
  pricePEN: number;
  priceUSD?: number;
  currency: string;
  url: string;
  notes?: string;
}

export interface MarketResponse {
  summary: string;
  stores: MarketResult[];
  error?: string;
}

export async function queryMarketPrices(
  category: string,
  brand: string,
  productName: string
): Promise<MarketResponse> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      summary: '',
      stores: [],
      error: 'No se ha configurado la API Key de Gemini. Agrega VITE_GEMINI_API_KEY en el archivo .env',
    };
  }

  const prompt = `quiero que me digas los precios en perú de una ${category} ${brand} ${productName} y los links de 3 tiendas

IMPORTANTE: Los links deben ser URLs REALES que existan y lleven directamente al producto o a la tienda. NO inventes URLs.

Responde SOLAMENTE con un objeto JSON válido, sin explicaciones, sin backticks, sin markdown:
{"summary":"resumen de precios","stores":[{"storeName":"nombre real de la tienda","pricePEN":5000,"priceUSD":1300,"url":"https://url-real-del-producto","notes":"nota breve"}]}

- pricePEN en soles peruanos
- priceUSD solo si el precio original es en dólares (tipo de cambio 3.75)
- Ordena de menor a mayor precio
- Los URLs deben ser páginas reales donde se vende el producto`;

  let lastStatus = 0;

  for (const modelName of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        lastStatus = response.status;
        console.warn(`Gemini ${modelName}: status ${response.status}`);
        if (response.status === 404 || response.status === 503) continue;
        if (response.status === 429) {
          return { summary: '', stores: [], error: 'Límite de consultas alcanzado. Intenta en unos minutos.' };
        }
        continue;
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];

      // Collect all text from all parts
      let rawText = '';
      for (const part of parts) {
        if (part.text) rawText += part.text;
      }

      if (!rawText.trim()) continue;

      // Extract the JSON object from the text
      // The text may contain thinking/reasoning before or after the JSON
      const jsonObj = extractJsonObject(rawText);
      if (!jsonObj) {
        console.warn(`No JSON found in ${modelName} response, trying next model...`);
        continue;
      }

      const stores: MarketResult[] = (jsonObj.stores || []).map((s: any) => ({
        storeName: s.storeName || s.name || 'Tienda',
        pricePEN: parseFloat(s.pricePEN || s.price) || 0,
        priceUSD: s.priceUSD ? parseFloat(s.priceUSD) : undefined,
        currency: 'PEN',
        url: s.url || s.link || '#',
        notes: s.notes || '',
      }));

      stores.sort((a, b) => a.pricePEN - b.pricePEN);
      const validStores = stores.filter(s => s.pricePEN > 0 && s.url !== '#');

      if (validStores.length === 0) continue;

      return {
        summary: jsonObj.summary || `Precios encontrados para ${brand} ${productName}`,
        stores: validStores,
      };
    } catch (err) {
      console.error(`Error with ${modelName}:`, err);
      continue;
    }
  }

  return {
    summary: '',
    stores: [],
    error: `No se pudieron obtener precios. Intenta de nuevo. (${lastStatus || 'error de red'})`,
  };
}

/**
 * Extracts a valid JSON object from text that may contain thinking/reasoning.
 * Uses bracket matching to find the outermost {...} correctly,
 * even if there's text before or after.
 */
function extractJsonObject(text: string): any | null {
  // Clean markdown
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find first { character
  const start = cleaned.indexOf('{');
  if (start === -1) return null;

  // Use bracket matching to find the corresponding closing }
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        const jsonStr = cleaned.substring(start, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}
