/**
 * FAQ Section Component
 *
 * Frequently asked questions with accordion-style answers.
 */

import { ArrowDown01Icon, HelpCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

interface FAQItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is CADHY?",
    answer:
      "CADHY (Computer Aided Design for HYdraulics) is a professional desktop application for hydraulic engineering. It combines parametric 3D modeling with computational hydraulics, allowing engineers to design and analyze open channels, pipe networks, and hydraulic structures.",
  },
  {
    question: "Is CADHY free to use?",
    answer:
      "Yes, CADHY is currently free to download and use. We offer the full desktop application with all features included at no cost during our initial release phase.",
  },
  {
    question: "What platforms does CADHY support?",
    answer:
      "CADHY is available for Windows (x64), macOS (Apple Silicon and Intel), and Linux (AppImage). All platforms receive the same features and updates simultaneously.",
  },
  {
    question: "What hydraulic calculations can CADHY perform?",
    answer:
      "CADHY supports Manning equation calculations, normal and critical depth analysis, Froude number computation, Gradually Varied Flow (GVF) profiles (M1, M2, S1, S2, S3 classifications), and specific energy diagrams. Support for pipe networks with Hardy-Cross solver is coming soon.",
  },
  {
    question: "What is the AI assistant feature?",
    answer:
      "CADHY includes an integrated AI assistant that understands hydraulic engineering concepts. You can describe problems in natural language, get instant calculations, receive design recommendations, and have the AI help generate channel configurations based on your requirements.",
  },
  {
    question: "What geometry kernel does CADHY use?",
    answer:
      "CADHY is built on OpenCASCADE Technology (OCCT), the same industrial-grade B-Rep solid modeling kernel used by FreeCAD and other professional CAD systems. This enables precise parametric geometry, boolean operations, and export to standard CAD formats.",
  },
  {
    question: "Can I export my designs?",
    answer:
      "Currently CADHY supports 3D visualization and project saving. Export to STEP, IGES, STL, and DXF formats is planned for upcoming releases, enabling integration with other CAD and analysis software.",
  },
  {
    question: "How do I report bugs or request features?",
    answer:
      "You can report issues and request features through our GitHub repository. Visit the Issues section to submit bug reports or the Discussions section to propose new features and connect with other users.",
  },
]

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-foreground font-medium pr-4">{item.question}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={20}
          className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-96" : "max-h-0"}`}
      >
        <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">{item.answer}</div>
      </div>
    </div>
  )
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="relative border-t border-border bg-background py-24 px-8 lg:px-16" id="faq">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1 mb-6 rounded-full">
            <HugeiconsIcon icon={HelpCircleIcon} size={12} className="text-muted-foreground" />
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground">FAQ</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about CADHY and hydraulic engineering software.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => (
            <FAQItem
              key={item.question}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">Still have questions?</p>
          <a
            href="https://github.com/crhistian-cornejo/cadhy-releases/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground hover:text-foreground transition-colors border border-border px-6 py-3 hover:border-foreground/50 rounded-full"
          >
            <span>ASK IN DISCUSSIONS</span>
            <span>&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  )
}
