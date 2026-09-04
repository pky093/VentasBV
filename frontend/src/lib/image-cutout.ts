const cutoutCache = new Map<string, string>();

/**
 * Helper to dynamically remove solid white / light backgrounds from motorcycle images
 * and return a clean transparent cutout Data URL.
 */
export function removeWhiteBackground(
  imageSrc: string,
  tolerance: number = 30
): Promise<string> {
  if (cutoutCache.has(imageSrc)) {
    return Promise.resolve(cutoutCache.get(imageSrc)!);
  }

  return new Promise((resolve) => {
    if (!imageSrc) {
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check corners to see if background is white/light
        const topLeftR = data[0];
        const topLeftG = data[1];
        const topLeftB = data[2];
        const isWhiteBg = topLeftR > 220 && topLeftG > 220 && topLeftB > 220;

        if (!isWhiteBg) {
          // Already transparent or dark, return original
          cutoutCache.set(imageSrc, imageSrc);
          resolve(imageSrc);
          return;
        }

        const threshold = 255 - tolerance;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // If pixel is near-white
          if (r >= threshold && g >= threshold && b >= threshold) {
            data[i + 3] = 0; // Transparent
          } else if (r > 200 && g > 200 && b > 200) {
            // Smooth edge alpha feathering
            const minChannel = Math.min(r, g, b);
            const alpha = Math.max(0, 255 - (minChannel - 200) * 4.6);
            data[i + 3] = Math.min(data[i + 3], alpha);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        cutoutCache.set(imageSrc, dataUrl);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Could not process canvas transparency, using original:', err);
        cutoutCache.set(imageSrc, imageSrc);
        resolve(imageSrc);
      }
    };
    img.onerror = () => {
      cutoutCache.set(imageSrc, imageSrc);
      resolve(imageSrc);
    };
    img.src = imageSrc;
  });
}
