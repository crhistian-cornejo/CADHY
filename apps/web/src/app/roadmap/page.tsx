/**
 * Roadmap Page
 *
 * Placeholder for the roadmap page.
 */

import { LandingSEO } from "@/components/seo"

export default function RoadmapPage() {
  return (
    <>
      <LandingSEO
        title="Roadmap - CADHY"
        description="See what's coming next for CADHY - our development roadmap and planned features."
      />
      <div className="min-h-screen bg-background py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-foreground mb-6">Roadmap</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Our development roadmap is coming soon. Stay tuned for updates on planned features and
            improvements.
          </p>
          <a
            href="https://github.com/crhistian-cornejo/CADHY/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition-colors rounded-lg"
          >
            View Issues on GitHub
          </a>
        </div>
      </div>
    </>
  )
}
