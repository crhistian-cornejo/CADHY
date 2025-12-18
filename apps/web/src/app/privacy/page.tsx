/**
 * Privacy Policy Page
 */

import { PrivacySEO } from "@/components/seo"
import { useTranslation } from "@/lib/i18n"

export default function PrivacyPage() {
  const { t } = useTranslation()

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <PrivacySEO />
      <h1 className="text-4xl font-bold tracking-tighter mb-8">{t.privacy.title}</h1>
      <p className="text-muted-foreground mb-8">{t.privacy.lastUpdated}</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">{t.privacy.sections.introduction.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.privacy.sections.introduction.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">
            {t.privacy.sections.informationWeCollect.title}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t.privacy.sections.informationWeCollect.intro}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>
              <strong>{t.privacy.sections.informationWeCollect.items.localData.label}</strong>{" "}
              {t.privacy.sections.informationWeCollect.items.localData.content}
            </li>
            <li>
              <strong>{t.privacy.sections.informationWeCollect.items.aiFeatures.label}</strong>{" "}
              {t.privacy.sections.informationWeCollect.items.aiFeatures.content}
            </li>
            <li>
              <strong>{t.privacy.sections.informationWeCollect.items.updateChecks.label}</strong>{" "}
              {t.privacy.sections.informationWeCollect.items.updateChecks.content}
            </li>
            <li>
              <strong>
                {t.privacy.sections.informationWeCollect.items.websiteAnalytics.label}
              </strong>{" "}
              {t.privacy.sections.informationWeCollect.items.websiteAnalytics.content}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.privacy.sections.howWeUse.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.privacy.sections.howWeUse.intro}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            {t.privacy.sections.howWeUse.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.privacy.sections.thirdParty.title}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t.privacy.sections.thirdParty.intro}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>
              <strong>{t.privacy.sections.thirdParty.items.aiProviders.label}</strong>{" "}
              {t.privacy.sections.thirdParty.items.aiProviders.content}
            </li>
            <li>
              <strong>{t.privacy.sections.thirdParty.items.github.label}</strong>{" "}
              {t.privacy.sections.thirdParty.items.github.content}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.privacy.sections.dataSecurity.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.privacy.sections.dataSecurity.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.privacy.sections.yourRights.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.privacy.sections.yourRights.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.privacy.sections.childrensPrivacy.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.privacy.sections.childrensPrivacy.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.privacy.sections.changes.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.privacy.sections.changes.content}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">{t.privacy.sections.contact.title}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t.privacy.sections.contact.content}{" "}
            <a
              href="https://github.com/crhistian-cornejo/CADHY/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t.privacy.sections.contact.linkText}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
