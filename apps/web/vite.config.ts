import path from "node:path"
import mdx from "@mdx-js/rollup"
import rehypeShiki from "@shikijs/rehype"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { rehypeToc, remarkHeading } from "fumadocs-core/mdx-plugins"
import rehypeSlug from "rehype-slug"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"
import { defineConfig, type PluginOption } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  // For GitHub Pages: '/' (root of CADHY repo)
  // The landing page is deployed to crhistian-cornejo.github.io/CADHY/
  base: process.env.GITHUB_PAGES ? "/CADHY/" : "/",

  plugins: [
    // MDX must run before React plugin with enforce: 'pre'
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter, remarkHeading],
        rehypePlugins: [
          rehypeSlug,
          rehypeToc,
          [
            rehypeShiki,
            {
              theme: "github-dark",
            },
          ],
        ],
        providerImportSource: "@mdx-js/react",
      }),
    } as PluginOption,
    tsconfigPaths() as PluginOption,
    tailwindcss() as PluginOption,
    // Exclude MDX from React plugin - MDX plugin handles JSX transformation
    react({ exclude: /\.mdx$/ }) as unknown as PluginOption,
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@content": path.resolve(__dirname, "./content"),
    },
  },

  server: {
    port: 3000,
    host: true,
    watch: {
      usePolling: false,
    },
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "clsx", "tailwind-merge"],
    exclude: ["@cadhy/ui"], // Treat workspace package as source
  },

  build: {
    outDir: "dist",
    sourcemap: false, // Disable in production to reduce size
    minify: "esbuild", // Faster than terser, good compression
    target: "es2020", // Modern browsers only
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          motion: ["motion"],
          mdx: ["@mdx-js/react"],
        },
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 600,
  },
})
