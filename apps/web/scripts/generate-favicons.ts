/**
 * Script to generate optimized favicon files from LOGO.png source
 * Run with: bun run scripts/generate-favicons.ts
 */

import { writeFileSync } from "fs"
import { join } from "path"
import pngToIco from "png-to-ico"
import sharp from "sharp"

const PUBLIC_DIR = join(import.meta.dir, "../public")
const DESKTOP_LOGO = "/Users/corx/Developer/Tauri/CADHY/apps/desktop/public/LOGO.png"

// Icon sizes needed for various purposes
const ICON_SIZES = [
  { size: 16, name: "favicon-16x16.png" },
  { size: 32, name: "favicon-32x32.png" },
  { size: 48, name: "favicon-48x48.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "android-chrome-192x192.png" },
  { size: 512, name: "android-chrome-512x512.png" },
]

async function generateFavicons() {
  console.log("🎨 Generating favicons from desktop LOGO.png...\n")
  console.log(`📁 Source: ${DESKTOP_LOGO}\n`)

  // Generate PNG files at various sizes
  for (const { size, name } of ICON_SIZES) {
    const outputPath = join(PUBLIC_DIR, name)

    await sharp(DESKTOP_LOGO).resize(size, size).png({ quality: 100 }).toFile(outputPath)

    console.log(`✅ Generated ${name} (${size}x${size})`)
  }

  // Generate favicon.ico from multiple PNG sizes
  console.log("\n📦 Creating favicon.ico...")

  const icoSizes = [16, 32, 48]
  const pngBuffers: Buffer[] = []

  for (const size of icoSizes) {
    const buffer = await sharp(DESKTOP_LOGO).resize(size, size).png().toBuffer()
    pngBuffers.push(buffer)
  }

  // Generate ICO file
  const icoBuffer = await pngToIco(pngBuffers)
  writeFileSync(join(PUBLIC_DIR, "favicon.ico"), icoBuffer)
  console.log("✅ Generated favicon.ico (16x16, 32x32, 48x48)")

  // Create an optimized logo.png (for schema.org and general use)
  const logoPath = join(PUBLIC_DIR, "logo.png")
  await sharp(DESKTOP_LOGO).resize(512, 512).png({ quality: 90 }).toFile(logoPath)

  console.log(`✅ Generated optimized logo.png (512x512)`)

  // Generate favicon.svg from the PNG (optional, for modern browsers)
  // We'll create a simple SVG wrapper for the PNG data
  const pngBase64 = await sharp(DESKTOP_LOGO)
    .resize(32, 32)
    .png()
    .toBuffer()
    .then((buf) => buf.toString("base64"))

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
  <image href="data:image/png;base64,${pngBase64}" width="32" height="32"/>
</svg>`

  writeFileSync(join(PUBLIC_DIR, "favicon.svg"), svgContent)
  console.log("✅ Generated favicon.svg (32x32, embedded PNG)")

  console.log("\n🎉 Favicon generation complete!")
  console.log("\n📝 Summary of generated files:")
  console.log("   - favicon.ico (multi-size, for legacy browsers)")
  console.log("   - favicon.svg (for modern browsers)")
  console.log("   - favicon-16x16.png, favicon-32x32.png, favicon-48x48.png")
  console.log("   - apple-touch-icon.png (180x180)")
  console.log("   - android-chrome-192x192.png, android-chrome-512x512.png")
  console.log("   - logo.png (512x512, optimized)")
}

generateFavicons().catch(console.error)
