# Texture Quality Requirements for CADHY

This document describes the texture quality standards required for professional rendering
in CADHY, compatible with Blender and Three.js.

## PBR Texture Maps

CADHY uses Physically Based Rendering (PBR) with the following texture maps:

| Map Type | Purpose | Bit Depth | Format | Color Space |
|----------|---------|-----------|--------|-------------|
| **Albedo** | Base color | 8-bit | JPG/PNG | sRGB |
| **Normal** | Surface detail | 16-bit | PNG | Linear |
| **Roughness** | Surface smoothness | 8-bit | PNG | Linear |
| **Metalness** | Metal vs dielectric | 8-bit | PNG | Linear |
| **AO** | Ambient occlusion | 8-bit | PNG | Linear |
| **Displacement** | Height/depth | 16-bit | PNG/EXR | Linear |

## Why Bit Depth Matters

### 8-bit vs 16-bit

- **8-bit**: 256 levels of precision (0-255)
- **16-bit**: 65,536 levels of precision (0-65535)

For normal maps and displacement maps, 8-bit causes visible "banding" - stair-step
artifacts in smooth gradients. This is because:

1. **Normal maps** encode surface direction as RGB values
2. Small angle changes require precise values
3. JPG compression + 8-bit = visible steps on curved surfaces

### Example: Banding in Normal Maps

```
8-bit JPG normal map:  Surface looks "faceted" with visible steps
16-bit PNG normal map: Smooth, continuous surface detail
```

## Format Recommendations

### For Development (Fast Loading)
- Resolution: 1K (1024x1024)
- Format: JPG for albedo, PNG for others
- Size: ~1-3 MB per texture set

### For Production (Blender Quality)
- Resolution: 2K-4K (2048-4096)
- Format: PNG 16-bit for normal/displacement
- Size: ~10-30 MB per texture set

### For Export/Print
- Resolution: 4K (4096x4096)
- Format: EXR 32-bit for displacement
- Size: ~50-100 MB per texture set

## Normal Map Conventions

### OpenGL vs DirectX

CADHY and Three.js use **OpenGL** convention:
- Green channel (Y) points **UP** on the surface
- This matches Blender's default

If importing from a DirectX source (some game engines):
- Green channel points **DOWN**
- Use `flipNormalY: true` option in `applyPBRTexturesToMaterial()`

### Poly Haven Textures

When downloading from Poly Haven:
- Always prefer `nor_gl` (OpenGL format)
- `nor_dx` is DirectX format - requires Y-flip

## Downloading Quality Textures

Use the included script with quality options:

```bash
# Standard quality (1K, fast loading)
bun run scripts/download-textures.ts all 5 1k

# Production quality (2K, recommended)
bun run scripts/download-textures.ts all 5 2k

# High quality (4K, for final renders)
bun run scripts/download-textures.ts all 5 4k
```

The script automatically:
- Uses PNG for normal/roughness/AO maps (lossless)
- Uses EXR for displacement when available (high precision)
- Uses JPG for albedo (perceptual color, lossy OK)
- Prefers OpenGL normal maps (`nor_gl`)

## Applying Textures in Code

```typescript
import { applyPBRTexturesToMaterial, loadPBRTexturesFromPolyHaven } from '@/render/RE_texture_service'

// Load textures
const textures = await loadPBRTexturesFromPolyHaven('concrete_floor_001', '2k')

// Apply with options
applyPBRTexturesToMaterial(material, textures, {
  repeatX: 2,
  repeatY: 2,
  normalScale: 1.0,        // Intensity of bumps
  enableDisplacement: true,
  displacementScale: 0.05, // Height of displacement
  aoIntensity: 1.0,        // Ambient occlusion strength
})
```

## Common Issues

### Issue: Banding on curved surfaces
**Cause**: 8-bit JPG normal maps
**Solution**: Re-download textures with `2k` option (uses PNG)

### Issue: Normal map looks inverted
**Cause**: DirectX normal map used with OpenGL renderer
**Solution**: Use `flipNormalY: true` option

### Issue: Displacement looks too strong/weak
**Cause**: Scale mismatch with model units
**Solution**: Adjust `displacementScale` (typical range: 0.01-0.5)

### Issue: Textures look flat
**Cause**: Wrong color space assignment
**Solution**: Ensure non-albedo maps use `LinearSRGBColorSpace`

## Blender Compatibility

When exporting models from CADHY for Blender:

1. **Textures are automatically embedded** in GLTF/GLB exports
2. **Color spaces are preserved** (sRGB for albedo, Linear for data)
3. **Normal maps use OpenGL convention** (same as Blender default)

### Blender Import Settings

When importing GLTF in Blender:
- Enable "Import Shaders" - preserves PBR material setup
- Normal maps should work without adjustment
- Displacement may need scale adjustment based on scene units

## Resolution Guidelines by Use Case

| Use Case | Resolution | Normal Format | Displacement Format |
|----------|------------|---------------|---------------------|
| Real-time preview | 1K | JPG | None |
| Desktop app | 2K | PNG | PNG |
| High-quality render | 4K | PNG 16-bit | EXR 16-bit |
| VFX/Film | 8K | EXR 16-bit | EXR 32-bit |

## Sources

CADHY textures are sourced from:
- [Poly Haven](https://polyhaven.com) - CC0 license, high quality
- [AmbientCG](https://ambientcg.com) - CC0 license, various qualities
