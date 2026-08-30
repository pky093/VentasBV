import { Product } from './db-services';

export async function exportProductFlyerPdf(product: Product, tenantInfo: any = {}, exchangeRate: number = 3.75): Promise<void> {
  const usdPrice = product.price > 0 && exchangeRate > 0 ? Math.round(product.price / exchangeRate) : 0;
  const dealerName = tenantInfo.trade_name || tenantInfo.name || 'Ventas BV Motos';
  const dealerPhone = tenantInfo.phone || '999 888 777';
  const dealerAddress = tenantInfo.address || 'Av. Principal - Tienda Autorizada';

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '794px'; // A4 standard width at 96dpi
  container.style.backgroundColor = '#020617';
  container.style.color = '#ffffff';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  container.style.padding = '32px';
  container.style.boxSizing = 'border-box';

  const colorsHtml = (product.colors || [])
    .map(c => `<span style="display:inline-block; padding:4px 10px; border-radius:12px; background:#1e293b; border:1px solid #334155; font-size:11px; margin-right:6px; color:#f8fafc;">${c.color}</span>`)
    .join('');

  container.innerHTML = `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #020617 100%); border: 2px solid #334155; border-radius: 24px; padding: 28px; position: relative; overflow: hidden;">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #fbbf24; text-transform: uppercase;">
            ${dealerName}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            FICHA TÉCNICA Y COTIZACIÓN OFICIAL
          </div>
        </div>
        <div style="text-align: right;">
          <span style="background: #fbbf24; color: #000000; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">
            EDICIÓN 2026
          </span>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            Fecha: ${new Date().toLocaleDateString('es-PE')}
          </div>
        </div>
      </div>

      <!-- Main Body -->
      <div style="display: flex; gap: 24px; align-items: center; min-height: 380px;">
        
        <!-- Left: Image & Watermark -->
        <div style="flex: 1; text-align: center; position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; top: 0; left: 0; font-size: 70px; font-weight: 900; color: rgba(255,255,255,0.05); text-transform: uppercase; line-height: 1; pointer-events: none; z-index: 1;">
            ${(product.brand || 'MOTO').toUpperCase()}
          </div>
          ${
            product.imagePath
              ? `<img src="${product.imagePath}" style="max-height: 300px; max-width: 100%; object-fit: contain; position: relative; z-index: 2; filter: drop-shadow(0 20px 25px rgba(0,0,0,0.8));" />`
              : `<div style="height: 200px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px;">(Imagen no disponible)</div>`
          }
        </div>

        <!-- Right: Info & Pricing -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
          <div style="color: #fbbf24; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
            ${product.brand || ''} &bull; ${product.category || 'Motocicleta'}
          </div>
          <div style="font-size: 28px; font-weight: 900; color: #ffffff; text-transform: uppercase; margin-top: 4px; line-height: 1.1;">
            ${product.name}
          </div>

          <p style="font-size: 11px; color: #94a3b8; margin-top: 12px; line-height: 1.5;">
            Equipada con tecnología de última generación, máxima potencia de aceleración y óptima estabilidad en carretera y ciudad.
          </p>

          <!-- Specs Grid -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; margin-bottom: 16px;">
            <div style="background: rgba(30, 41, 59, 0.6); padding: 8px; border-radius: 10px; border: 1px solid #334155; text-align: center;">
              <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Frenos</div>
              <div style="font-size: 11px; font-weight: 700; color: #38bdf8;">Disco ABS</div>
            </div>
            <div style="background: rgba(30, 41, 59, 0.6); padding: 8px; border-radius: 10px; border: 1px solid #334155; text-align: center;">
              <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Inyección</div>
              <div style="font-size: 11px; font-weight: 700; color: #4ade80;">Electrónica</div>
            </div>
            <div style="background: rgba(30, 41, 59, 0.6); padding: 8px; border-radius: 10px; border: 1px solid #334155; text-align: center;">
              <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Garantía</div>
              <div style="font-size: 11px; font-weight: 700; color: #fbbf24;">12 Meses</div>
            </div>
          </div>

          <!-- Pricing Section -->
          <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 16px; padding: 14px; margin-top: 4px;">
            <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">
              PRECIO ESPECIAL DE CONTADO / CRÉDITO
            </div>
            <div style="font-size: 32px; font-weight: 900; color: #ffffff; margin-top: 2px;">
              S/ ${product.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            ${
              usdPrice > 0
                ? `<div style="font-size: 12px; font-weight: 700; color: #fbbf24; margin-top: 2px;">
                    USD $ ${usdPrice.toLocaleString('en-US')} * <span style="font-size: 10px; color: #94a3b8; font-weight: 400;">(T/C ${exchangeRate.toFixed(2)} referencial)</span>
                  </div>`
                : ''
            }
          </div>

          <!-- Colors -->
          ${
            colorsHtml
              ? `<div style="margin-top: 14px;">
                  <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Colores Disponibles:</div>
                  <div>${colorsHtml}</div>
                </div>`
              : ''
          }
        </div>
      </div>

      <!-- Footer / Store Info -->
      <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
        <div>
          <strong>Ubicación:</strong> ${dealerAddress}
        </div>
        <div>
          <strong>WhatsApp Ventas:</strong> ${dealerPhone}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const filename = `Flyer_${(product.brand || 'Moto')}_${product.name.replace(/\s+/g, '_')}.pdf`;
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#020617' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
    };

    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('Error generating PDF flyer:', err);
  } finally {
    document.body.removeChild(container);
  }
}
