const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const uploadedPng = 'C:/Users/pboca/.gemini/antigravity/brain/c3114e3a-dc2f-4883-b76e-444472b0cfdc/.user_uploaded/media_1788143767030.png';

const tempSquarePng = path.join(__dirname, 'temp_square_256.png');
const electronIconPng = path.join(__dirname, 'electron', 'icon.png');
const publicIconPng = path.join(__dirname, 'public', 'icon.png');
const heroLogoPng = path.join(__dirname, 'public', 'bv-hero-logo.png');
const brandLogoPng = path.join(__dirname, 'public', 'ventas-bv-logo.png');

const electronIconIco = path.join(__dirname, 'electron', 'icon.ico');
const publicIconIco = path.join(__dirname, 'public', 'favicon.ico');
const rootIconIco = path.join(__dirname, 'icon.ico');

async function processIcons() {
  console.log('Procesando imagen con Jimp...');
  try {
    const image = await Jimp.read(uploadedPng);
    const size = Math.max(image.bitmap.width, image.bitmap.height);
    
    // Create square canvas with black background if needed or resize directly
    image.resize({ w: 256, h: 256 });
    await image.write(tempSquarePng);

    // Save PNG versions
    fs.copyFileSync(tempSquarePng, electronIconPng);
    fs.copyFileSync(tempSquarePng, publicIconPng);
    fs.copyFileSync(uploadedPng, heroLogoPng);
    fs.copyFileSync(uploadedPng, brandLogoPng);

    console.log('Generando archivo .ico...');
    const icoBuf = await pngToIco(tempSquarePng);
    fs.writeFileSync(electronIconIco, icoBuf);
    fs.writeFileSync(publicIconIco, icoBuf);
    fs.writeFileSync(rootIconIco, icoBuf);

    if (fs.existsSync(tempSquarePng)) fs.unlinkSync(tempSquarePng);
    console.log('¡Iconos .ico y .png generados con éxito!');
  } catch (err) {
    console.error('Error procesando iconos:', err);
  }
}

processIcons();
