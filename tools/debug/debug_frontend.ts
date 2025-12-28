#!/usr/bin/env bun
/**
 * Frontend Debug Utilities
 *
 * Provides debugging utilities for the React/Three.js frontend:
 * - Memory leak detection
 * - React component tree analysis
 * - Three.js scene inspection
 * - Performance profiling
 *
 * Usage: bun run tools/debug/debug_frontend.ts [command]
 * Commands: memory, components, scene, perf
 */

// ============================================================================
// TYPES
// ============================================================================

interface MemoryInfo {
  jsHeapSizeLimit: number
  totalJSHeapSize: number
  usedJSHeapSize: number
}

interface DebugCommand {
  name: string
  description: string
  script: string
}

// ============================================================================
// DEBUG SCRIPTS (to inject in browser)
// ============================================================================

const DEBUG_SCRIPTS: Record<string, DebugCommand> = {
  memory: {
    name: "Memory Analysis",
    description: "Analyze JavaScript heap memory usage",
    script: `
(function() {
  if (!performance.memory) {
    console.warn('Memory API not available. Use Chrome with --enable-precise-memory-info');
    return;
  }

  const mem = performance.memory;
  const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

  console.group('🧠 Memory Analysis');
  console.log('Heap Limit:', formatMB(mem.jsHeapSizeLimit));
  console.log('Total Heap:', formatMB(mem.totalJSHeapSize));
  console.log('Used Heap:', formatMB(mem.usedJSHeapSize));
  console.log('Usage:', ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1) + '%');
  console.groupEnd();

  // Check for potential leaks
  if (mem.usedJSHeapSize > mem.jsHeapSizeLimit * 0.8) {
    console.warn('⚠️ High memory usage detected! Consider profiling for leaks.');
  }
})();
`,
  },

  components: {
    name: "React Component Tree",
    description: "Analyze React component hierarchy",
    script: `
(function() {
  const root = document.getElementById('root');
  if (!root || !root._reactRootContainer) {
    console.warn('React root not found');
    return;
  }

  function getComponentTree(fiber, depth = 0) {
    if (!fiber || depth > 10) return;

    const indent = '  '.repeat(depth);
    const name = fiber.type?.displayName || fiber.type?.name || fiber.type || 'Unknown';

    if (typeof name === 'string' && name[0] === name[0].toUpperCase()) {
      console.log(indent + '📦 ' + name);
    }

    if (fiber.child) getComponentTree(fiber.child, depth + 1);
    if (fiber.sibling) getComponentTree(fiber.sibling, depth);
  }

  console.group('⚛️ React Component Tree');
  const fiber = root._reactRootContainer._internalRoot?.current;
  if (fiber) {
    getComponentTree(fiber.child);
  }
  console.groupEnd();
})();
`,
  },

  scene: {
    name: "Three.js Scene Inspector",
    description: "Inspect Three.js scene objects and resources",
    script: `
(function() {
  // Find Three.js renderer
  const canvases = document.querySelectorAll('canvas');
  let renderer = null;
  let scene = null;

  for (const canvas of canvases) {
    if (canvas.__three_renderer) {
      renderer = canvas.__three_renderer;
      break;
    }
  }

  // Try to find scene from window (often exposed in dev)
  if (window.__THREE_SCENE__) {
    scene = window.__THREE_SCENE__;
  }

  console.group('🎨 Three.js Scene Inspector');

  if (renderer) {
    const info = renderer.info;
    console.group('Renderer Info');
    console.log('Geometries:', info.memory.geometries);
    console.log('Textures:', info.memory.textures);
    console.log('Draw calls:', info.render.calls);
    console.log('Triangles:', info.render.triangles);
    console.log('Points:', info.render.points);
    console.log('Lines:', info.render.lines);
    console.groupEnd();
  } else {
    console.log('Renderer not found (expose via canvas.__three_renderer)');
  }

  if (scene) {
    console.group('Scene Objects');
    let meshCount = 0, lightCount = 0, cameraCount = 0;

    scene.traverse((obj) => {
      if (obj.isMesh) meshCount++;
      if (obj.isLight) lightCount++;
      if (obj.isCamera) cameraCount++;
    });

    console.log('Meshes:', meshCount);
    console.log('Lights:', lightCount);
    console.log('Cameras:', cameraCount);
    console.log('Total objects:', scene.children.length);
    console.groupEnd();
  } else {
    console.log('Scene not found (expose via window.__THREE_SCENE__)');
  }

  console.groupEnd();

  console.log('\\n💡 Tip: In your code, add:');
  console.log('   canvas.__three_renderer = renderer;');
  console.log('   window.__THREE_SCENE__ = scene;');
})();
`,
  },

  perf: {
    name: "Performance Profile",
    description: "Measure rendering performance",
    script: `
(function() {
  console.group('⏱️ Performance Profile');

  // Frame timing
  let frames = 0;
  let lastTime = performance.now();
  const fpsSamples = [];

  function measureFrame() {
    frames++;
    const now = performance.now();

    if (now - lastTime >= 1000) {
      fpsSamples.push(frames);
      frames = 0;
      lastTime = now;

      if (fpsSamples.length >= 5) {
        const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
        const minFps = Math.min(...fpsSamples);
        const maxFps = Math.max(...fpsSamples);

        console.log('FPS (5s sample):');
        console.log('  Average:', avgFps.toFixed(1));
        console.log('  Min:', minFps);
        console.log('  Max:', maxFps);
        console.groupEnd();
        return;
      }
    }

    requestAnimationFrame(measureFrame);
  }

  console.log('Measuring FPS for 5 seconds...');
  requestAnimationFrame(measureFrame);

  // Long tasks
  if (PerformanceObserver) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('⚠️ Long task detected:', entry.duration.toFixed(1) + 'ms');
        }
      }
    });
    observer.observe({ entryTypes: ['longtask'] });

    setTimeout(() => observer.disconnect(), 5000);
  }
})();
`,
  },

  textures: {
    name: "Texture Cache Inspector",
    description: "Inspect loaded textures and their memory usage",
    script: `
(function() {
  console.group('🖼️ Texture Cache Inspector');

  // Try to access texture manager
  if (window.__TEXTURE_MANAGER__) {
    const stats = window.__TEXTURE_MANAGER__.getStats();
    console.log('Cache size:', stats.size);
    console.log('Cached textures:', stats.count);
    console.log('Currently loading:', stats.loading);
  } else {
    console.log('Texture manager not exposed.');
    console.log('Add: window.__TEXTURE_MANAGER__ = textureManager;');
  }

  // Count all textures in scene
  if (window.__THREE_SCENE__) {
    const textures = new Set();
    window.__THREE_SCENE__.traverse((obj) => {
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (mat.map) textures.add(mat.map.uuid);
          if (mat.normalMap) textures.add(mat.normalMap.uuid);
          if (mat.roughnessMap) textures.add(mat.roughnessMap.uuid);
          if (mat.metalnessMap) textures.add(mat.metalnessMap.uuid);
          if (mat.aoMap) textures.add(mat.aoMap.uuid);
          if (mat.displacementMap) textures.add(mat.displacementMap.uuid);
        }
      }
    });
    console.log('Unique textures in scene:', textures.size);
  }

  console.groupEnd();
})();
`,
  },
}

// ============================================================================
// MAIN
// ============================================================================

function printHelp() {
  console.log("Frontend Debug Utilities")
  console.log("═".repeat(60))
  console.log()
  console.log("Usage: bun run tools/debug/debug_frontend.ts <command>")
  console.log()
  console.log("Commands:")
  for (const [key, cmd] of Object.entries(DEBUG_SCRIPTS)) {
    console.log(`  ${key.padEnd(12)} - ${cmd.description}`)
  }
  console.log()
  console.log("This generates JavaScript code to paste in browser DevTools.")
  console.log()
  console.log("Example:")
  console.log("  bun run tools/debug/debug_frontend.ts memory")
  console.log("  # Copy the output and paste in Chrome DevTools Console")
}

function main() {
  const command = process.argv[2]

  if (!command || command === "--help" || command === "-h") {
    printHelp()
    return
  }

  const cmd = DEBUG_SCRIPTS[command]
  if (!cmd) {
    console.error(`Unknown command: ${command}`)
    console.log()
    printHelp()
    process.exit(1)
  }

  console.log(`// ${cmd.name}`)
  console.log(`// ${cmd.description}`)
  console.log("// Paste this in Chrome DevTools Console (F12)")
  console.log("// " + "─".repeat(56))
  console.log(cmd.script.trim())
}

main()
