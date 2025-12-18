/**
 * Landing Page
 *
 * Main marketing page for CADHY with all sections.
 */

import { ChangelogSection } from "@/components/landing/changelog-section"
import { DownloadSection } from "@/components/landing/download-section"
import { FAQSection } from "@/components/landing/faq-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HeroSection } from "@/components/landing/hero-section"
import { RoadmapSection } from "@/components/landing/roadmap-section"
import { LandingSEO } from "@/components/seo"

export default function LandingPage() {
  return (
    <>
      <LandingSEO />
      <HeroSection />
      <FeaturesSection />
      <RoadmapSection />
      <ChangelogSection />
      <FAQSection />
      <DownloadSection />
    </>
  )
}
