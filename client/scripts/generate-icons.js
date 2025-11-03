/**
 * Generate PWA icons from SVG
 * 
 * This script requires sharp: npm install sharp --save-dev
 * Run: node client/scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');

async function generateIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error('❌ icon.svg not found at:', svgPath);
    console.log('💡 Please create an SVG icon first at client/public/icon.svg');
    process.exit(1);
  }

  console.log('🎨 Generating icons from SVG...');
  
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  // Generate favicon.ico (32x32) and logo192.png
  try {
    await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✅ Generated favicon.ico');
    
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'logo192.png'));
    console.log('✅ Generated logo192.png');
  } catch (error) {
    console.error('❌ Failed to generate favicon/logo:', error.message);
  }

  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
