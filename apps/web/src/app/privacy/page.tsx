/**
 * Privacy Policy Page
 */

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <h1 className="text-4xl font-bold tracking-tighter mb-8">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: December 2025</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            CADHY ("we", "our", or "us") is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, and safeguard your information when you use our
            desktop application and website.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            CADHY is designed with privacy in mind. We collect minimal data:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>
              <strong>Local Data:</strong> All project files, calculations, and settings are stored
              locally on your device. We do not have access to your project data.
            </li>
            <li>
              <strong>AI Features:</strong> If you use the AI assistant, your prompts are sent to
              third-party AI providers (Anthropic, OpenAI, or Google) using your own API keys. We do
              not store or have access to these conversations.
            </li>
            <li>
              <strong>Update Checks:</strong> The application may check for updates, which involves
              connecting to our GitHub repository. This does not transmit any personal information.
            </li>
            <li>
              <strong>Website Analytics:</strong> Our website may use basic analytics to understand
              visitor patterns. No personally identifiable information is collected.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            Since we collect minimal data, our use is limited to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Providing application updates and security patches</li>
            <li>Improving our website and documentation</li>
            <li>Responding to support requests you initiate</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">4. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            CADHY integrates with optional third-party services:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>
              <strong>AI Providers:</strong> When using AI features, your data is subject to the
              privacy policies of Anthropic, OpenAI, or Google, depending on which provider you
              configure.
            </li>
            <li>
              <strong>GitHub:</strong> Updates and releases are distributed through GitHub. Their
              privacy policy applies to interactions with their platform.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your project data remains on your local device. We recommend following standard security
            practices: keeping your operating system updated, using strong passwords, and backing up
            your project files regularly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">6. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            Since we don't collect personal data, there is no personal information for us to
            provide, modify, or delete. Your project files are entirely under your control on your
            local device.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">7. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            CADHY is professional engineering software not directed at children under 13. We do not
            knowingly collect information from children.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">8. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">9. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy, please open an issue on our{" "}
            <a
              href="https://github.com/crhistian-cornejo/cadhy-releases/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
