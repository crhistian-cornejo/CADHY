/**
 * FAQ Section Component - CAD Style Terminal Design
 *
 * Interactive FAQ with selectable questions and CAD-style decorative elements.
 * Features terminal-like IN:/OUT: labels, blur transitions, and animated Bézier curve.
 */

import { useState } from "react"
import { useTranslation } from "@/lib/i18n"

interface FAQItem {
  question: string
  answer: string
}

// FAQ items are hardcoded since they contain technical details
// that don't need frequent translation updates
const FAQ_ITEMS_EN: FAQItem[] = [
  {
    question: "What is CADHY?",
    answer:
      "CADHY stands for Computer-Aided Design for HYdraulics. It's a professional desktop application for hydraulic engineering that combines parametric 3D modeling with computational hydraulics, allowing engineers to design and analyze open channels, pipe networks, and hydraulic structures.",
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

const FAQ_ITEMS_ES: FAQItem[] = [
  {
    question: "¿Qué es CADHY?",
    answer:
      "CADHY significa Computer-Aided Design for HYdraulics (Diseño Asistido por Computadora para Hidráulica). Es una aplicación de escritorio profesional para ingeniería hidráulica que combina modelado 3D paramétrico con hidráulica computacional, permitiendo a los ingenieros diseñar y analizar canales abiertos, redes de tuberías y estructuras hidráulicas.",
  },
  {
    question: "¿CADHY es gratis?",
    answer:
      "Sí, CADHY actualmente es gratuito para descargar y usar. Ofrecemos la aplicación de escritorio completa con todas las características incluidas sin costo durante nuestra fase de lanzamiento inicial.",
  },
  {
    question: "¿Qué plataformas soporta CADHY?",
    answer:
      "CADHY está disponible para Windows (x64), macOS (Apple Silicon e Intel) y Linux (AppImage). Todas las plataformas reciben las mismas características y actualizaciones simultáneamente.",
  },
  {
    question: "¿Qué cálculos hidráulicos puede realizar CADHY?",
    answer:
      "CADHY soporta cálculos con la ecuación de Manning, análisis de tirante normal y crítico, cálculo del número de Froude, perfiles de Flujo Gradualmente Variado (FGV) (clasificaciones M1, M2, S1, S2, S3), y diagramas de energía específica. El soporte para redes de tuberías con el método Hardy-Cross viene pronto.",
  },
  {
    question: "¿Qué es la función de asistente IA?",
    answer:
      "CADHY incluye un asistente de IA integrado que entiende conceptos de ingeniería hidráulica. Puedes describir problemas en lenguaje natural, obtener cálculos instantáneos, recibir recomendaciones de diseño, y hacer que la IA ayude a generar configuraciones de canales basadas en tus requerimientos.",
  },
  {
    question: "¿Qué kernel de geometría usa CADHY?",
    answer:
      "CADHY está construido sobre OpenCASCADE Technology (OCCT), el mismo kernel de modelado sólido B-Rep de grado industrial usado por FreeCAD y otros sistemas CAD profesionales. Esto permite geometría paramétrica precisa, operaciones booleanas y exportación a formatos CAD estándar.",
  },
  {
    question: "¿Puedo exportar mis diseños?",
    answer:
      "Actualmente CADHY soporta visualización 3D y guardado de proyectos. La exportación a formatos STEP, IGES, STL y DXF está planificada para próximas versiones, permitiendo integración con otro software CAD y de análisis.",
  },
  {
    question: "¿Cómo reporto bugs o solicito características?",
    answer:
      "Puedes reportar problemas y solicitar características a través de nuestro repositorio en GitHub. Visita la sección de Issues para enviar reportes de bugs o la sección de Discussions para proponer nuevas características y conectar con otros usuarios.",
  },
]

// CAD-style SVG pattern background component
function CADPatternBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Pattern: CAD blueprint style with small squares and lines */}
        <pattern id="pattern-cad" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          {/* Main grid */}
          <path
            d="M 80 0 L 0 0 0 80"
            fill="none"
            className="stroke-current text-muted-foreground/8"
            strokeWidth="0.5"
          />
          {/* Sub grid */}
          <path
            d="M 40 0 L 40 80 M 0 40 L 80 40"
            fill="none"
            className="stroke-current text-muted-foreground/5"
            strokeWidth="0.25"
          />
          {/* Corner markers */}
          <rect
            x="0"
            y="0"
            width="3"
            height="3"
            className="fill-current text-muted-foreground/10"
          />
          <rect
            x="38.5"
            y="0"
            width="3"
            height="3"
            className="fill-current text-muted-foreground/5"
          />
          <rect
            x="0"
            y="38.5"
            width="3"
            height="3"
            className="fill-current text-muted-foreground/5"
          />
          {/* Small cross markers */}
          <path
            d="M 20 18 L 20 22 M 18 20 L 22 20"
            fill="none"
            className="stroke-current text-muted-foreground/8"
            strokeWidth="0.5"
          />
          <path
            d="M 60 18 L 60 22 M 58 20 L 62 20"
            fill="none"
            className="stroke-current text-muted-foreground/8"
            strokeWidth="0.5"
          />
          <path
            d="M 20 58 L 20 62 M 18 60 L 22 60"
            fill="none"
            className="stroke-current text-muted-foreground/8"
            strokeWidth="0.5"
          />
          <path
            d="M 60 58 L 60 62 M 58 60 L 62 60"
            fill="none"
            className="stroke-current text-muted-foreground/8"
            strokeWidth="0.5"
          />
        </pattern>

        {/* Pattern: Small dots */}
        <pattern id="pattern-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" className="fill-current text-muted-foreground/15" />
        </pattern>
      </defs>

      {/* Background layers */}
      <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-cad)" />
      <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-dots)" />
    </svg>
  )
}

// CAD-style corner decoration component
function CADCorner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const baseClasses = "absolute w-4 h-4"
  const positionClasses = {
    tl: "top-0 left-0 border-t-2 border-l-2",
    tr: "top-0 right-0 border-t-2 border-r-2",
    bl: "bottom-0 left-0 border-b-2 border-l-2",
    br: "bottom-0 right-0 border-b-2 border-r-2",
  }

  return (
    <div className={`${baseClasses} ${positionClasses[position]} border-muted-foreground/30`} />
  )
}

// Navigation arrows component
function NavigationArrows({
  onUp,
  onDown,
  canGoUp,
  canGoDown,
}: {
  onUp: () => void
  onDown: () => void
  canGoUp: boolean
  canGoDown: boolean
}) {
  return (
    <div className="flex items-center gap-1 ml-4">
      <button
        type="button"
        onClick={onUp}
        disabled={!canGoUp}
        className={`text-lg font-light transition-opacity ${
          canGoUp
            ? "text-foreground hover:text-primary cursor-pointer"
            : "text-muted-foreground/30 cursor-not-allowed"
        }`}
        aria-label="Previous question"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!canGoDown}
        className={`text-lg font-light transition-opacity ${
          canGoDown
            ? "text-foreground hover:text-primary cursor-pointer"
            : "text-muted-foreground/30 cursor-not-allowed"
        }`}
        aria-label="Next question"
      >
        ↓
      </button>
    </div>
  )
}

// Question item with blur/scale/rotation effects based on distance
function QuestionItem({
  question,
  distance,
  onClick,
  isSelected,
}: {
  question: string
  distance: number
  onClick: () => void
  isSelected: boolean
}) {
  // Calculate rotation based on distance (positive above, negative below)
  const rotationAmount = distance

  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 flex items-center origin-left transform-gpu cursor-pointer font-medium transition-all duration-300 ease-in-out select-none text-left w-full hover:translate-x-0 hover:scale-100 hover:opacity-100 hover:blur-none"
      style={{
        // Distance-based transformations
        transform: `
          translateX(${-Math.abs(distance) * 2}px)
          scale(${1 - Math.abs(distance) * 0.03})
          rotate(${rotationAmount * -0.5}deg)
        `,
        opacity: isSelected ? 1 : Math.max(0.3, 1 - Math.abs(distance) * 0.15),
        filter: isSelected ? "none" : `blur(${Math.abs(distance) * 0.8}px)`,
        transitionDuration: `${Math.abs(distance) * 50 + 150}ms`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Selection indicator line */}
        <div
          className={`mt-2 h-1.5 transition-all duration-200 ${
            isSelected ? "w-4 bg-foreground" : "w-1 bg-muted-foreground/30"
          }`}
        />
        <span className={isSelected ? "font-semibold text-foreground" : "text-foreground/80"}>
          {question}
        </span>
      </div>
    </button>
  )
}

export function FAQSection() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { t, language } = useTranslation()

  const faqItems = language === "es" ? FAQ_ITEMS_ES : FAQ_ITEMS_EN
  const selectedItem = faqItems[selectedIndex]

  // Guard against undefined selectedItem
  if (!selectedItem) return null

  const handleUp = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const handleDown = () => {
    if (selectedIndex < faqItems.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  return (
    <section
      className="relative border-t border-border bg-background py-24 px-8 lg:px-16 overflow-hidden"
      id="faq"
    >
      {/* CAD Pattern Background */}
      <CADPatternBackground />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header - CAD Style */}
        <div className="mb-12 text-center">
          <h2 className="text-xs font-mono tracking-[0.3em] text-muted-foreground mb-4">
            COMMON QUESTIONS
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-muted-foreground/30" />
            <div className="w-2 h-2 border border-muted-foreground/50 rotate-45" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-muted-foreground/30" />
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Panel - Questions List with Blur Effect */}
          <div className="relative">
            {/* CAD Corner Decorations */}
            <CADCorner position="tl" />
            <CADCorner position="bl" />

            {/* Questions container with transform offset */}
            <div
              className="flex flex-col py-4 pl-6 pr-4 transition-transform duration-300 ease-in-out overflow-hidden"
              style={{
                transform: `translateY(${-selectedIndex * 48 + 96}px)`,
              }}
            >
              {faqItems.map((item, index) => (
                <QuestionItem
                  key={item.question}
                  question={item.question}
                  distance={index - selectedIndex}
                  onClick={() => setSelectedIndex(index)}
                  isSelected={index === selectedIndex}
                />
              ))}
            </div>

            {/* Gradient masks for top and bottom fade */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

            {/* Decorative vertical line */}
            <div className="absolute left-0 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-muted-foreground/20 to-transparent" />
          </div>

          {/* Right Panel - Answer Display */}
          <div className="relative">
            {/* CAD Corner Decorations */}
            <CADCorner position="tr" />
            <CADCorner position="br" />

            <div className="py-4 px-6 min-h-[300px]">
              {/* Question Header with Navigation */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground tracking-wider">
                    IN:
                  </span>
                  <span className="font-mono text-sm uppercase tracking-wide text-foreground">
                    {selectedItem.question.replace("?", "").replace("¿", "").slice(0, 40)}
                    {selectedItem.question.length > 40 ? "..." : ""}?
                  </span>
                </div>
                <NavigationArrows
                  onUp={handleUp}
                  onDown={handleDown}
                  canGoUp={selectedIndex > 0}
                  canGoDown={selectedIndex < faqItems.length - 1}
                />
              </div>

              {/* Separator line */}
              <div className="flex items-center gap-2 mb-6">
                <div className="h-px flex-1 bg-border" />
                <div className="w-1 h-1 bg-muted-foreground/50" />
                <div className="w-1 h-1 bg-muted-foreground/30" />
                <div className="w-1 h-1 bg-muted-foreground/20" />
              </div>

              {/* Answer Content with transition */}
              <div className="space-y-4" key={selectedIndex}>
                <div className="flex items-start gap-4 animate-fade-in">
                  <span className="font-mono text-xs text-muted-foreground tracking-wider mt-0.5 flex-shrink-0">
                    OUT:
                  </span>
                  <div className="space-y-4">
                    <p className="text-foreground leading-relaxed">{selectedItem.answer}</p>
                  </div>
                </div>
              </div>

              {/* Question counter */}
              <div className="absolute bottom-4 right-6 font-mono text-[10px] text-muted-foreground/50 tracking-widest">
                {String(selectedIndex + 1).padStart(2, "0")}/
                {String(faqItems.length).padStart(2, "0")}
              </div>
            </div>

            {/* Decorative bottom detail */}
            <div className="absolute bottom-0 left-6 right-6 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-muted-foreground/10 via-muted-foreground/30 to-muted-foreground/10" />
            </div>
          </div>
        </div>

        {/* Bottom CAD Decorations */}
        <div className="mt-16 flex items-center justify-center gap-8">
          {/* Left decoration */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-px bg-muted-foreground/20" />
            <div className="w-2 h-2 border border-muted-foreground/30 rotate-45" />
            <div className="w-2 h-px bg-muted-foreground/40" />
          </div>

          {/* Center - Contact CTA */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-3 tracking-wide">{t.faq.contact}</p>
            <a
              href="https://github.com/crhistian-cornejo/CADHY/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors border border-border px-5 py-2 hover:border-foreground/50"
            >
              <span className="uppercase">{t.faq.contactLink}</span>
              <span className="text-lg">→</span>
            </a>
          </div>

          {/* Right decoration */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-px bg-muted-foreground/40" />
            <div className="w-2 h-2 border border-muted-foreground/30 rotate-45" />
            <div className="w-8 h-px bg-muted-foreground/20" />
          </div>
        </div>

        {/* Blueprint-style coordinate markers */}
        <div className="absolute top-8 right-8 font-mono text-[8px] text-muted-foreground/30 tracking-wider hidden lg:block">
          SEC.04
        </div>
        <div className="absolute bottom-8 left-8 font-mono text-[8px] text-muted-foreground/30 tracking-wider hidden lg:block">
          FAQ.001
        </div>
      </div>
    </section>
  )
}
