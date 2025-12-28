/**
 * Landing Page
 *
 * Main marketing page for CADHY with all sections.
 * Features CAD-style pattern dividers between sections.
 */

import { CADSectionDivider } from "@/components/landing/cad-divider"
import { ChangelogSection } from "@/components/landing/changelog-section"
import { DownloadSection } from "@/components/landing/download-section"
import { FAQSection } from "@/components/landing/faq-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HeroSection } from "@/components/landing/hero-section"
import { LandingSEO } from "@/components/seo"

export default function LandingPage() {
  return (
    <>
      <LandingSEO />
      <HeroSection />
      <CADSectionDivider label="FEATURES" />
      <FeaturesSection />
      <CADSectionDivider label="CHANGELOG" />
      <ChangelogSection />
      <CADSectionDivider label="FAQ" />
      <FAQSection />
      <CADSectionDivider label="DOWNLOAD" />
      <DownloadSection />
    </>
  )
}
