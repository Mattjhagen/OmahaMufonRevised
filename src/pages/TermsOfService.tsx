import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/60 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tracker
          </a>
          <div className="flex items-center gap-3 mt-3">
            <FileText className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">MUFON Omaha Airspace Tracker</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 space-y-6 text-slate-300">
          <p className="text-sm text-slate-400">
            <strong>Last Updated:</strong> October 25, 2026
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using the MUFON Omaha Airspace Tracker service ("Service"), operated by the Mutual UFO
              Network (MUFON) Omaha chapter, you agree to be bound by these Terms of Service ("Terms"). If you do not
              agree to these Terms, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. Description of Service</h2>
            <p className="leading-relaxed">
              The MUFON Omaha Airspace Tracker provides:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Real-time aircraft tracking using ADS-B receiver data</li>
              <li>Historical aircraft position rewind (90-day archive)</li>
              <li>UAP/UFO sighting report submission and public archive</li>
              <li>Correlation of sighting reports with aircraft positions</li>
              <li>Weather condition overlays for observational context</li>
              <li>Google Chat integration for team collaboration (optional)</li>
              <li>Push notifications for chat updates (optional)</li>
            </ul>
            <p className="leading-relaxed mt-3">
              The Service is provided for informational, educational, and research purposes related to aerospace tracking
              and UAP investigation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. User Responsibilities</h2>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">3.1 Accurate Information</h3>
            <p className="leading-relaxed">
              You agree to provide accurate, truthful, and complete information when submitting sighting reports or
              interacting with the Service. Fabricated or misleading reports undermine scientific investigation and may
              result in removal of your content and suspension of access.
            </p>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">3.2 Prohibited Conduct</h3>
            <p className="leading-relaxed">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Submit false, defamatory, harassing, or offensive content</li>
              <li>Upload copyrighted images or materials without permission</li>
              <li>Reverse-engineer, scrape, or automate access to the Service without authorization</li>
              <li>Interfere with or disrupt the Service's functionality or security</li>
              <li>Use the Service for illegal activities or to violate aviation safety regulations</li>
              <li>Impersonate others or misrepresent your affiliation with any organization</li>
              <li>Collect or harvest personal information about other users</li>
            </ul>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">3.3 Google Chat Integration</h3>
            <p className="leading-relaxed">
              If you use Google Sign-In and Google Chat features, you agree to comply with Google's Terms of Service and
              use the integration responsibly. OAuth access tokens are handled securely and are not stored persistently.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Public Sighting Reports</h2>
            <p className="leading-relaxed">
              <strong className="text-amber-400">IMPORTANT:</strong> By submitting a sighting report, you acknowledge and
              agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                Your report (including your name, location, description, photos, and timestamp) will be{' '}
                <strong className="text-white">publicly visible</strong> to all users of the Service
              </li>
              <li>
                Reports are displayed on the map, sightings archive, and may be used for correlation analysis
              </li>
              <li>
                You grant MUFON Omaha a perpetual, royalty-free license to display, reproduce, and analyze your report
                for research and educational purposes
              </li>
              <li>
                You are responsible for the accuracy and legality of the content you submit
              </li>
              <li>
                You may request deletion of your report, but we reserve the right to retain archived copies for
                historical research
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Intellectual Property</h2>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">5.1 Our Content</h3>
            <p className="leading-relaxed">
              The Service's software, design, graphics, interface, and underlying technology are owned by MUFON Omaha or
              its licensors and are protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">5.2 User Content</h3>
            <p className="leading-relaxed">
              You retain ownership of photos and content you upload. By submitting content, you grant us a worldwide,
              non-exclusive, royalty-free license to use, display, reproduce, and distribute your content in connection
              with the Service.
            </p>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">5.3 Third-Party Data</h3>
            <p className="leading-relaxed">
              Aircraft tracking data is sourced from ADS-B receivers, OpenSky Network, and Flightradar24. Weather data is
              provided by OpenWeather. Map tiles are provided by CARTO. These third-party data sources have their own
              terms and limitations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">6. Disclaimers and Limitations of Liability</h2>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">6.1 "As-Is" Service</h3>
            <p className="leading-relaxed">
              The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied,
              including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Accuracy, completeness, or reliability of aircraft tracking data</li>
              <li>Availability, uptime, or uninterrupted access</li>
              <li>Fitness for any particular purpose</li>
              <li>Freedom from errors, bugs, or security vulnerabilities</li>
            </ul>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">6.2 Data Accuracy</h3>
            <p className="leading-relaxed">
              <strong className="text-amber-400">CRITICAL DISCLAIMER:</strong> Aircraft positions, weather data, and
              sighting correlations are provided for <strong>informational purposes only</strong>. Do NOT use this
              Service for:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Aviation navigation or flight planning</li>
              <li>Air traffic control or collision avoidance</li>
              <li>Emergency response or safety-critical decisions</li>
              <li>Legal proceedings or official investigations</li>
            </ul>
            <p className="leading-relaxed mt-3">
              ADS-B coverage has gaps, receivers may fail, and data may be delayed, incomplete, or inaccurate. Always
              refer to official FAA/aviation sources for authoritative information.
            </p>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">6.3 Limitation of Liability</h3>
            <p className="leading-relaxed">
              To the fullest extent permitted by law, MUFON Omaha and its operators shall not be liable for any indirect,
              incidental, consequential, special, or punitive damages arising from your use of the Service, including but
              not limited to loss of data, revenue, or reputation, even if advised of the possibility of such damages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">7. Privacy and Data Collection</h2>
            <p className="leading-relaxed">
              Your use of the Service is governed by our{' '}
              <a href="/privacy" className="text-cyan-400 hover:underline font-semibold">
                Privacy Policy
              </a>
              , which explains how we collect, use, and protect your information. By using the Service, you consent to
              our data practices as described in the Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">8. Termination</h2>
            <p className="leading-relaxed">
              We reserve the right to suspend or terminate your access to the Service at any time, with or without cause
              or notice, for violations of these Terms, abusive behavior, or any other reason at our sole discretion.
            </p>
            <p className="leading-relaxed">
              Upon termination, your right to use the Service immediately ceases. Sections of these Terms that by their
              nature should survive termination (including disclaimers, limitations of liability, and intellectual
              property provisions) shall survive.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">9. Changes to Terms</h2>
            <p className="leading-relaxed">
              We may modify these Terms at any time. We will notify users of material changes by posting an updated
              version on this page with a new "Last Updated" date. Your continued use of the Service after changes
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">10. Governing Law and Dispute Resolution</h2>
            <p className="leading-relaxed">
              These Terms are governed by the laws of the State of Nebraska, United States, without regard to conflict of
              law principles. Any disputes arising from these Terms or your use of the Service shall be resolved in the
              state or federal courts located in Douglas County, Nebraska.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">11. Contact Information</h2>
            <p className="leading-relaxed">
              For questions about these Terms or the Service, please contact:
            </p>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 mt-3">
              <p className="font-semibold text-white">MUFON Omaha Airspace Tracker</p>
              <p className="text-sm">Email: <a href="mailto:mattjhagen0@gmail.com" className="text-cyan-400 hover:underline">mattjhagen0@gmail.com</a></p>
              <p className="text-sm">Website: <a href="https://mufonomaha.space" className="text-cyan-400 hover:underline">https://mufonomaha.space</a></p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">12. Severability</h2>
            <p className="leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or
              eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <div className="border-t border-slate-800 pt-6 mt-8">
            <p className="text-xs text-slate-500 text-center">
              By using the MUFON Omaha Airspace Tracker, you acknowledge that you have read, understood, and agree to be
              bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
