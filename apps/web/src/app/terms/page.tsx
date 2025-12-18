/**
 * Terms of Service Page
 */

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <h1 className="text-4xl font-bold tracking-tighter mb-8">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: December 2025</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By downloading, installing, or using CADHY ("the Software"), you agree to be bound by
            these Terms of Service. If you do not agree to these terms, do not use the Software.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">2. License Grant</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Subject to these Terms, we grant you a limited, non-exclusive, non-transferable,
            revocable license to use the Software for personal and professional purposes.
          </p>
          <p className="text-muted-foreground leading-relaxed">You may NOT:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Reverse engineer, decompile, or disassemble the Software</li>
            <li>Modify, adapt, or create derivative works based on the Software</li>
            <li>Distribute, sublicense, lease, or lend the Software to third parties</li>
            <li>Remove or alter any proprietary notices or labels</li>
            <li>Use the Software for any unlawful purpose</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">3. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            CADHY and all related intellectual property rights are owned by us. The Software
            includes components built with open-source libraries (OpenCASCADE, Tauri, React, etc.)
            which retain their respective licenses. Your use of these components is subject to their
            individual license terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">4. User Content</h2>
          <p className="text-muted-foreground leading-relaxed">
            You retain all rights to the projects, designs, and data you create using CADHY. We
            claim no ownership over your work product. Your files are stored locally on your device
            and are your responsibility to backup and secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">5. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            CADHY may integrate with third-party services (AI providers, GitHub). Your use of these
            services is subject to their respective terms and conditions. We are not responsible for
            the availability, accuracy, or content of third-party services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">6. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground leading-relaxed">
            THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL
            WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            CADHY is engineering software intended to assist professionals. All calculations,
            analyses, and designs should be independently verified by qualified engineers. We do not
            guarantee the accuracy of any calculations or results.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA,
            OR GOODWILL, ARISING FROM YOUR USE OF THE SOFTWARE.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            You acknowledge that hydraulic engineering involves complex calculations and real-world
            conditions that software cannot fully replicate. You assume all responsibility for the
            application of results produced by the Software.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">8. Updates and Modifications</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may release updates, patches, or new versions of the Software at our discretion. We
            reserve the right to modify, suspend, or discontinue the Software at any time without
            notice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">9. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may terminate your license to use the Software at any time if you violate these
            Terms. Upon termination, you must cease all use of the Software and delete all copies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">10. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with applicable laws,
            without regard to conflict of law principles.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to modify these Terms at any time. Continued use of the Software
            after changes constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">12. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms, please open an issue on our{" "}
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
