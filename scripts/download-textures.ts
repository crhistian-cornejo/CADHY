/**
 * Download Textures Script
 *
 * Downloads PBR textures from Poly Haven for offline use.
 * Uses optimal formats for each map type to ensure Blender-compatible quality:
 * - Albedo: JPG (perceptual color, lossy OK)
 * - Normal: PNG 16-bit (linear data, lossless required)
 * - Displacement: PNG 16-bit or EXR (height precision critical)
 * - Roughness/AO/Metalness: PNG (linear data)
 *
 * Usage: bun run scripts/download-textures.ts [category|all] [limit] [resolution]
 * Example: bun run scripts/download-textures.ts all 5 2k
 */

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

const POLY_HAVEN_API = "https://api.polyhaven.com"
const OUTPUT_DIR = join(process.cwd(), "apps/desktop/public/textures")

// Default resolution - 2K recommended for quality, 1K for fast loading
const DEFAULT_RESOLUTION = "2k"

/**
 * Format preferences by map type for optimal quality
 * - Normal/Displacement: Prefer PNG (lossless) or EXR (16-bit)
 * - Albedo: JPG is acceptable (perceptual, lossy OK)
 * - Others: PNG preferred for linear data
 */
const FORMAT_PREFERENCES: Record<string, string[]> = {
  albedo: ["jpg", "png"], // Lossy OK for color
  normal: ["png", "exr", "jpg"], // Lossless required - PNG 16-bit ideal
  displacement: ["exr", "png", "jpg"], // High precision needed
  roughness: ["png", "jpg"], // Linear data, PNG preferred
  ao: ["png", "jpg"], // Linear data, PNG preferred
  metalness: ["png", "jpg"], // Linear data, PNG preferred
}

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
 * Get download URLs for a texture with optimal format selection
 */
async function getTextureUrls(
  textureId: string,
  resolution: string
): Promise<Record<string, { url: string; format: string }>> {
  const response = await fetch(`${POLY_HAVEN_API}/files/${textureId}`)
  if (!response.ok) throw new Error(`Failed to fetch texture files for ${textureId}`)

  const data = (await response.json()) as TextureFiles
  const urls: Record<string, { url: string; format: string }> = {}

  // Map types from Poly Haven to our naming
  // Priority: nor_gl (OpenGL) over nor_dx (DirectX) for Three.js/Blender compatibility
  const mapTypeMapping: Record<string, { name: string; priority: number }> = {
    Diffuse: { name: "albedo", priority: 1 },
    Color: { name: "albedo", priority: 2 },
    nor_gl: { name: "normal", priority: 1 }, // OpenGL format - preferred for Three.js/Blender
    nor_dx: { name: "normal", priority: 2 }, // DirectX format - fallback only
    Displacement: { name: "displacement", priority: 1 },
    disp: { name: "displacement", priority: 2 },
    Rough: { name: "roughness", priority: 1 },
    rough: { name: "roughness", priority: 2 },
    AO: { name: "ao", priority: 1 },
    ao: { name: "ao", priority: 2 },
    arm: { name: "ao", priority: 3 }, // ARM combined - last resort
    Metal: { name: "metalness", priority: 1 },
    metal: { name: "metalness", priority: 2 },
  }

  // Track which map types we've found (to handle priority)
  const foundTypes: Record<string, number> = {}

  // Extract URLs for each map type at specified resolution
  for (const [mapType, resolutions] of Object.entries(data)) {
    const mapping = mapTypeMapping[mapType]
    if (!mapping) continue

    // Check if we already have a higher priority version
    if (foundTypes[mapping.name] && foundTypes[mapping.name] < mapping.priority) {
      continue
    }

    // Try resolutions: specified, then fallback to 1k
    const resolutionData = resolutions[resolution] || resolutions["1k"]
    if (!resolutionData) continue

    // Get format preferences for this map type
    const formatPrefs = FORMAT_PREFERENCES[mapping.name] || ["png", "jpg"]

    // Find the best available format
    let selectedFormat: string | null = null
    let selectedUrl: string | null = null

    for (const format of formatPrefs) {
      const fileData = resolutionData[format]
      if (fileData?.url) {
        selectedFormat = format
        selectedUrl = fileData.url
        break
      }
    }

    if (selectedUrl && selectedFormat) {
      urls[mapping.name] = { url: selectedUrl, format: selectedFormat }
      foundTypes[mapping.name] = mapping.priority
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
 * Download all maps for a texture with format-aware naming
 */
async function downloadTexture(textureId: string, resolution: string): Promise<void> {
  console.log(`\n📦 Downloading ${textureId} @ ${resolution}...`)

  const urls = await getTextureUrls(textureId, resolution)
  const textureDir = join(OUTPUT_DIR, textureId)

  await mkdir(textureDir, { recursive: true })

  const downloads: Promise<void>[] = []
  const downloadedFormats: string[] = []

  for (const [mapType, { url, format }] of Object.entries(urls)) {
    // Use the actual format from the URL
    const ext = format === "exr" ? "exr" : format === "png" ? "png" : "jpg"
    const filename = `${mapType}.${ext}`
    const outputPath = join(textureDir, filename)

    // Show format info for important maps
    const qualityNote =
      (mapType === "normal" || mapType === "displacement") && ext !== "jpg"
        ? " ✨ (high quality)"
        : ""

    console.log(`  ⬇️  ${filename}${qualityNote}`)
    downloadedFormats.push(`${mapType}:${ext}`)
    downloads.push(downloadFile(url, outputPath))
  }

  await Promise.all(downloads)
  console.log(`✅ Downloaded ${Object.keys(urls).length} maps: ${downloadedFormats.join(", ")}`)
}

/**
 * Create texture manifest file (single category)
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
 * Create texture manifest file (multiple categories)
 */
async function createManifestMultiCategory(
  texturesByCategory: Record<string, string[]>,
  resolution: string
): Promise<void> {
  const manifest = {
    version: "2.0.0",
    resolution,
    formatPolicy: "optimal", // Uses best format per map type
    formats: {
      albedo: "jpg",
      normal: "png", // PNG 16-bit preferred
      displacement: "png", // EXR if available, else PNG
      roughness: "png",
      ao: "png",
      metalness: "png",
    },
    categories: texturesByCategory,
    generated: new Date().toISOString(),
  }

  const manifestPath = join(OUTPUT_DIR, "manifest.json")
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\n📋 Created manifest: ${manifestPath}`)
}

/**
 * Professional CAD/Architecture texture categories
 * Organized by material type for construction and design
 */
const CAD_CATEGORIES = {
  // STRUCTURAL MATERIALS
  concrete: ["concrete"], // Concrete surfaces, exposed concrete
  metal: ["metal"], // Steel, aluminum, industrial metals
  wood: ["wood"], // Lumber, panels, flooring
  brick: ["brick"], // Brick walls, pavers
  stone: ["stone"], // Natural stone, marble, granite

  // GROUND & TERRAIN
  ground: ["ground"], // Soil, dirt, terrain
  asphalt: ["asphalt"], // Roads, parking lots
  gravel: ["gravel"], // Gravel, aggregate
  sand: ["sand"], // Sand, beaches
  grass: ["grass"], // Lawns, vegetation

  // FINISHES
  tiles: ["tiles"], // Floor/wall tiles
  plaster: ["plaster"], // Stucco, plaster walls
  paint: ["paint"], // Painted surfaces
  wallpaper: ["wallpaper"], // Decorative walls

  // INDUSTRIAL
  plastic: ["plastic"], // Plastic materials
  rubber: ["rubber"], // Rubber surfaces

  // NATURAL
  rock: ["rock"], // Rocks, cliffs
  water: ["water"], // Water surfaces

  // INTERIOR
  fabric: ["fabric"], // Upholstery, curtains
  carpet: ["carpet"], // Carpet flooring
  leather: ["leather"], // Leather surfaces

  // ROOFING
  roof: ["roof"], // Roof materials
  shingles: ["shingles"], // Roof shingles
} as const

/**
 * Main function
 */
async function main() {
  const downloadAll = process.argv[2] === "all"
  const categories = downloadAll ? Object.keys(CAD_CATEGORIES) : [process.argv[2] || "concrete"]

  const limitPerCategory = Number.parseInt(process.argv[3] || "5", 10)
  const resolution = process.argv[4] || DEFAULT_RESOLUTION

  console.log("🎨 CADHY Texture Downloader (Blender-Quality)")
  console.log("=".repeat(60))
  console.log(`Mode: ${downloadAll ? "ALL CATEGORIES" : "Single Category"}`)
  console.log(`Categories: ${categories.join(", ")}`)
  console.log(`Limit per category: ${limitPerCategory}`)
  console.log(`Resolution: ${resolution}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log("")
  console.log("📋 Format Selection (optimal for Blender/Three.js):")
  console.log("   • Albedo: JPG (perceptual color)")
  console.log("   • Normal: PNG 16-bit (OpenGL format, no banding)")
  console.log("   • Displacement: EXR/PNG (high precision)")
  console.log("   • Roughness/AO: PNG (linear data)")
  console.log("=".repeat(60))

  try {
    // Create output directory
    await mkdir(OUTPUT_DIR, { recursive: true })

    const allTextures: Record<string, string[]> = {}

    // Download textures for each category
    for (const category of categories) {
      console.log(`\n${"=".repeat(60)}`)
      console.log(`📦 Processing category: ${category.toUpperCase()}`)
      console.log("=".repeat(60))

      const textureIds = await fetchTextures(category, limitPerCategory)
      allTextures[category] = textureIds

      for (const textureId of textureIds) {
        try {
          await downloadTexture(textureId, resolution)
        } catch (error) {
          console.error(`❌ Failed to download ${textureId}:`, error)
        }
      }
    }

    // Create manifest with all categories and resolution info
    await createManifestMultiCategory(allTextures, resolution)

    console.log("\n✅ Download complete!")
    console.log(`📁 Textures saved to: ${OUTPUT_DIR}`)
    console.log(`📊 Total categories: ${categories.length}`)
    console.log(`📊 Total textures: ${Object.values(allTextures).flat().length}`)
    console.log(`📐 Resolution: ${resolution}`)
    console.log("")
    console.log("💡 Tip: Run with '2k' or '4k' for higher quality:")
    console.log("   bun run scripts/download-textures.ts all 5 2k")
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

main()
