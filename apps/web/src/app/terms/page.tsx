/**
 * Terms of Service Page
 */

import { TermsSEO } from "@/components/seo"
import { useTranslation } from "@/lib/i18n"

export default function TermsPage() {
  const { t } = useTranslation()

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <TermsSEO />
      <h1 className="text-4xl font-bold tracking-tighter mb-8">{t.terms.title}</h1>
      <p className="text-muted-foreground mb-8">{t.terms.lastUpdated}</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.acceptance.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.acceptance.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.license.title}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t.terms.sections.license.intro}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.license.youMayNot}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            {t.terms.sections.license.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.intellectualProperty.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.intellectualProperty.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.userContent.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.userContent.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.thirdPartyServices.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.thirdPartyServices.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.disclaimer.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.disclaimer.content1}
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            {t.terms.sections.disclaimer.content2}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.liability.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.liability.content1}
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            {t.terms.sections.liability.content2}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.updates.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.updates.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.termination.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.termination.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.governingLaw.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.governingLaw.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.changesToTerms.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.changesToTerms.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.terms.sections.contact.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.terms.sections.contact.content}{" "}
            <a
              href="https://github.com/crhistian-cornejo/CADHY/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t.terms.sections.contact.linkText}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
