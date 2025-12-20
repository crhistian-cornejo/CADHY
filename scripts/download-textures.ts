/**
 * Download Textures Script
 *
 * Downloads PBR textures from Poly Haven for offline use
 * Usage: bun run scripts/download-textures.ts
 */

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

const POLY_HAVEN_API = "https://api.polyhaven.com"
const OUTPUT_DIR = join(process.cwd(), "apps/desktop/public/textures")
const RESOLUTION = "1k"

interface TextureAsset {
  name: string
  categories: string[]
  tags: string[]
}

interface TextureFiles {
  [mapType: string]: {
    [resolution: string]: {
      [format: string]: {
        url: string
        size: number
        md5: string
      }
    }
  }
}

/**
 * Fetch available textures from Poly Haven
 */
async function fetchTextures(category: string, limit = 10): Promise<string[]> {
  console.log(`\n📥 Fetching ${category} textures from Poly Haven...`)

  const response = await fetch(`${POLY_HAVEN_API}/assets?t=textures`)
  if (!response.ok) throw new Error("Failed to fetch textures")

  const data = (await response.json()) as Record<string, TextureAsset>
  const textureIds: string[] = []

  for (const [id, info] of Object.entries(data)) {
    if (category && !info.categories?.includes(category)) continue
    textureIds.push(id)
    if (textureIds.length >= limit) break
  }

  console.log(`✅ Found ${textureIds.length} ${category} textures`)
  return textureIds
}

/**
 * Get download URLs for a texture
 */
async function getTextureUrls(textureId: string): Promise<Record<string, string>> {
  const response = await fetch(`${POLY_HAVEN_API}/files/${textureId}`)
  if (!response.ok) throw new Error(`Failed to fetch texture files for ${textureId}`)

  const data = (await response.json()) as TextureFiles
  const urls: Record<string, string> = {}

  // Map types from Poly Haven to our naming
  const mapTypeMapping: Record<string, string> = {
    Diffuse: "albedo",
    Color: "albedo",
    nor_gl: "normal",
    nor_dx: "normal",
    Displacement: "displacement",
    disp: "displacement",
    Rough: "roughness",
    rough: "roughness",
    arm: "ao", // ARM = AO + Roughness + Metalness combined
    ao: "ao",
    Metal: "metalness",
    metal: "metalness",
  }

  // Extract URLs for each map type at specified resolution
  for (const [mapType, resolutions] of Object.entries(data)) {
    const normalizedType = mapTypeMapping[mapType]
    if (!normalizedType) continue

    const resolutionData = resolutions[RESOLUTION]
    if (!resolutionData) continue

    // Prefer JPG for smaller file size
    const fileData = resolutionData.jpg || resolutionData.png
    if (fileData?.url) {
      urls[normalizedType] = fileData.url
    }
  }

  return urls
}

/**
 * Download a file from URL
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download ${url}`)

  const buffer = await response.arrayBuffer()
  await writeFile(outputPath, Buffer.from(buffer))
}

/**
 * Download all maps for a texture
 */
async function downloadTexture(textureId: string): Promise<void> {
  console.log(`\n📦 Downloading ${textureId}...`)

  const urls = await getTextureUrls(textureId)
  const textureDir = join(OUTPUT_DIR, textureId)

  await mkdir(textureDir, { recursive: true })

  const downloads: Promise<void>[] = []

  for (const [mapType, url] of Object.entries(urls)) {
    const ext = url.endsWith(".png") ? "png" : "jpg"
    const filename = `${mapType}.${ext}`
    const outputPath = join(textureDir, filename)

    console.log(`  ⬇️  ${mapType}.${ext}`)
    downloads.push(downloadFile(url, outputPath))
  }

  await Promise.all(downloads)
  console.log(`✅ Downloaded ${Object.keys(urls).length} maps for ${textureId}`)
}

/**
 * Create texture manifest file
 */
async function createManifest(textureIds: string[], category: string): Promise<void> {
  const manifest = {
    version: "1.0.0",
    category,
    resolution: RESOLUTION,
    textures: textureIds,
    generated: new Date().toISOString(),
  }

  const manifestPath = join(OUTPUT_DIR, "manifest.json")
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\n📋 Created manifest: ${manifestPath}`)
}

/**
 * Main function
 */
async function main() {
  const category = process.argv[2] || "concrete"
  const limit = Number.parseInt(process.argv[3] || "10", 10)

  console.log("🎨 CADHY Texture Downloader")
  console.log("=".repeat(50))
  console.log(`Category: ${category}`)
  console.log(`Limit: ${limit}`)
  console.log(`Resolution: ${RESOLUTION}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log("=".repeat(50))

  try {
    // Create output directory
    await mkdir(OUTPUT_DIR, { recursive: true })

    // Fetch texture IDs
    const textureIds = await fetchTextures(category, limit)

    // Download textures
    for (const textureId of textureIds) {
      try {
        await downloadTexture(textureId)
      } catch (error) {
        console.error(`❌ Failed to download ${textureId}:`, error)
      }
    }

    // Create manifest
    await createManifest(textureIds, category)

    console.log("\n✅ Download complete!")
    console.log(`📁 Textures saved to: ${OUTPUT_DIR}`)
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

main()
