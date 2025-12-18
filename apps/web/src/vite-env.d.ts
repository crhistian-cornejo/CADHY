/// <reference types="vite/client" />

declare module "*.mdx" {
  const MDXComponent: React.ComponentType
  export default MDXComponent
}
