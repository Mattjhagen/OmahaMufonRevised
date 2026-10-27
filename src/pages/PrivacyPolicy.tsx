import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
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
            <Shield className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
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
            <h2 className="text-xl font-bold text-white">1. Introduction</h2>
            <p className="leading-relaxed">
              The MUFON Omaha Airspace Tracker ("we," "our," or "the Service") is operated by the Mutual UFO Network (MUFON)
              Omaha chapter. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
              you use our airspace tracking and UAP (Unidentified Anomalous Phenomena) reporting service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Sighting Reports:</strong> When you submit a UAP sighting report, we collect your name, contact
                information, location coordinates, sighting details, descriptions, timestamps, photos, and any other
                information you voluntarily provide.
              </li>
              <li>
                <strong>Google Account Information:</strong> If you sign in with Google to access Google Chat integration
                features, we receive your Google profile information (name, email, profile picture) and an OAuth access
                token to interact with Google Chat on your behalf.
              </li>
              <li>
                <strong>Chat Messages:</strong> Messages you send through our integrated chat system are stored locally
                and may be shared with other users viewing the same chat feed.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Location Data:</strong> We collect geolocation coordinates when you submit sighting reports or
                use location-based features. Location access is requested with your permission.
              </li>
              <li>
                <strong>Device Information:</strong> We collect IP addresses, browser type, device type, and operating
                system information for analytics and security purposes.
              </li>
              <li>
                <strong>Usage Data:</strong> We track which features you use, timestamps of interactions, and error logs
                to improve service performance.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Display live and historical aircraft tracking data</li>
              <li>Correlate sighting reports with ADS-B aircraft positions</li>
              <li>Enable collaboration via Google Chat integration</li>
              <li>Display public sighting reports on the map and archive</li>
              <li>Send push notifications about new chat messages (if you opt in)</li>
              <li>Analyze patterns in UAP sighting reports</li>
              <li>Improve service functionality and user experience</li>
              <li>Comply with legal obligations and investigate potential violations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Information Sharing and Disclosure</h2>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">4.1 Public Information</h3>
            <p className="leading-relaxed">
              <strong>Sighting reports you submit are publicly visible</strong> on the map and sightings archive. Your
              name, sighting time, location, description, and any uploaded photos will be visible to all users of the service.
            </p>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">4.2 Third-Party Services</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Google Firebase & Google Chat API:</strong> Authentication and Google Chat integration are provided
                by Google. Your OAuth tokens and Google Chat interactions are governed by Google's Privacy Policy.
              </li>
              <li>
                <strong>OpenWeather API:</strong> We use OpenWeather to display weather conditions. Location data may be
                sent to OpenWeather for weather queries.
              </li>
              <li>
                <strong>CARTO Maps:</strong> Map tiles are served by CARTO. Your map interactions may be logged by CARTO.
              </li>
              <li>
                <strong>ADS-B Data Sources:</strong> Aircraft positions are sourced from local ADS-B receivers and public
                ADS-B networks (OpenSky, Flightradar24).
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-cyan-400 mt-4">4.3 Legal Requirements</h3>
            <p className="leading-relaxed">
              We may disclose your information if required by law, court order, or government request, or to protect the
              rights, property, or safety of our users or the public.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Sighting Reports:</strong> Stored indefinitely for historical analysis and public record unless
                you request deletion.
              </li>
              <li>
                <strong>Aircraft Tracking Data:</strong> Historical ADS-B observations are stored for 90 days for rewind
                correlation features.
              </li>
              <li>
                <strong>Chat Messages:</strong> Stored locally for up to 30 days or until database maintenance.
              </li>
              <li>
                <strong>Google OAuth Tokens:</strong> Stored in memory during your session and cleared when you log out.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">6. Your Rights</h2>
            <p className="leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your sighting reports (subject to our public records policy)</li>
              <li>Opt out of push notifications at any time</li>
              <li>Revoke Google Chat access via Google Account settings</li>
            </ul>
            <p className="leading-relaxed mt-3">
              To exercise these rights, please contact us at{' '}
              <a href="mailto:mattjhagen0@gmail.com" className="text-cyan-400 hover:underline">
                mattjhagen0@gmail.com
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">7. Security</h2>
            <p className="leading-relaxed">
              We implement reasonable security measures to protect your information, including HTTPS encryption, secure
              database storage, and OAuth 2.0 authentication. However, no internet transmission or storage system is
              completely secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">8. Children's Privacy</h2>
            <p className="leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal
              information from children under 13. If you believe we have collected information from a child under 13,
              please contact us immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">9. Changes to This Privacy Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify users of material changes by posting
              the updated policy on this page with a new "Last Updated" date. Your continued use of the service after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">10. Contact Us</h2>
            <p className="leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact:
            </p>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 mt-3">
              <p className="font-semibold text-white">MUFON Omaha Airspace Tracker</p>
              <p className="text-sm">Email: <a href="mailto:mattjhagen0@gmail.com" className="text-cyan-400 hover:underline">mattjhagen0@gmail.com</a></p>
              <p className="text-sm">Website: <a href="https://mufonomaha.space" className="text-cyan-400 hover:underline">https://mufonomaha.space</a></p>
            </div>
          </section>

          <div className="border-t border-slate-800 pt-6 mt-8">
            <p className="text-xs text-slate-500 text-center">
              This Privacy Policy is effective as of October 25, 2026 and applies to all users of the MUFON Omaha Airspace Tracker service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
