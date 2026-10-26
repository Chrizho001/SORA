import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, FileText, Brain, Sparkles } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | SORA Study",
  description:
    "Learn how SORA handles your account data, study documents, flashcards, quiz scores, and AI summarisation with Google Gemini.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-paper text-ink selection:bg-[#c8f560] selection:text-night py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b border-line pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-display font-semibold text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Home</span>
          </Link>
          <span className="text-xs font-display font-bold uppercase tracking-wider text-muted">
            Legal & Privacy
          </span>
        </div>

        {/* Page Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-display font-bold">
            <Shield className="size-3.5 text-emerald-600" />
            <span>Data Transparency</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body leading-relaxed">
            Last updated: October 26, 2026. This policy truthfully and transparently outlines what data SORA collects, how your study materials are stored, and how AI processing is performed.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 font-body text-sm text-ink-2 leading-relaxed">
          {/* Section 1: Overview */}
          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <Lock className="size-5 text-[#14161f]" />
              <span>1. Overview & Commitment</span>
            </h2>
            <p>
              SORA is an intelligent academic study platform built to help students turn course PDFs, lecture slides, and notes into structured summaries, active recall flashcards, and practice quizzes. We respect your academic privacy and operate with minimal data collection principles. We never sell your personal data or course content.
            </p>
          </section>

          {/* Section 2: Data We Store */}
          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-6 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <FileText className="size-5 text-[#14161f]" />
              <span>2. Data Collected & Stored</span>
            </h2>
            <p>When you use SORA, the following categories of information are stored on secure servers:</p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-canvas/60 border border-line/60 space-y-1">
                <h3 className="font-display font-bold text-xs text-ink uppercase tracking-wider">
                  Account Information
                </h3>
                <p className="text-xs text-muted">
                  Your first name, last name, verified email address, securely salted password hash (if using email sign-in), account creation timestamp, and Google authentication provider identifier (if using Google Sign-In).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-canvas/60 border border-line/60 space-y-1">
                <h3 className="font-display font-bold text-xs text-ink uppercase tracking-wider">
                  Study Tasks & Planner
                </h3>
                <p className="text-xs text-muted">
                  Study blocks, homework deadlines, assignment milestones, priority levels (Low, Medium, High), task descriptions, and completion timestamps created within your Schedule & Task Manager.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-canvas/60 border border-line/60 space-y-1">
                <h3 className="font-display font-bold text-xs text-ink uppercase tracking-wider">
                  Uploaded Lecture PDFs & Documents
                </h3>
                <p className="text-xs text-muted">
                  PDF documents you upload for analysis (lecture slides, textbook chapters, problem sets, and syllabi), original filenames, document byte sizes, page counts, and analysis status records.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-canvas/60 border border-line/60 space-y-1">
                <h3 className="font-display font-bold text-xs text-ink uppercase tracking-wider">
                  Flashcard Decks & Cards
                </h3>
                <p className="text-xs text-muted">
                  Flashcard decks, deck titles, descriptions, and individual flashcard questions and answers—both those generated by AI and cards you create or edit manually.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-canvas/60 border border-line/60 space-y-1">
                <h3 className="font-display font-bold text-xs text-ink uppercase tracking-wider">
                  Quiz Sessions & Test Results
                </h3>
                <p className="text-xs text-muted">
                  Speed quiz drill sessions, questions presented, multiple-choice options, answers you select, scores achieved, completion times, and historical quiz performance for progress tracking.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-canvas/60 border border-line/60 space-y-1">
                <h3 className="font-display font-bold text-xs text-ink uppercase tracking-wider">
                  Notification Subscriptions & Preferences
                </h3>
                <p className="text-xs text-muted">
                  Browser Web Push subscription credentials (push endpoint URL, P256DH public key, and auth secret token), user agent metadata, and your in-app/push notification toggle preferences.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: AI Processing & Google Gemini */}
          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              <span>3. AI Summarisation with Google Gemini</span>
            </h2>
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <p className="text-xs font-display font-semibold text-amber-900">
                Third-Party Multimodal Processing Disclosure:
              </p>
              <p className="text-xs text-amber-800 leading-relaxed font-body">
                When you upload a lecture PDF or request AI-generated study aids, the text, slide images, and diagrams contained within the PDF are securely transmitted via encrypted API connections to <strong>Google Gemini</strong> (Google AI). Google Gemini processes the content exclusively to extract concepts, generate comprehensive academic summaries, and create question-and-answer flashcard pairs. SORA does not grant Google permission to use your submitted documents to train foundational public models.
              </p>
            </div>
            <p>
              Generated summaries and flashcard items are saved to your personal SORA database account so you can review them offline, practice them across devices, and organize them into custom study decks.
            </p>
          </section>

          {/* Section 4: Security & Cookie Management */}
          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <Lock className="size-5 text-[#14161f]" />
              <span>4. Security & Cookie Usage</span>
            </h2>
            <p>
              SORA uses strictly necessary <code>HttpOnly</code> cookies for user authentication and session security. JWT access tokens are kept exclusively in volatile browser memory and are never persisted to <code>localStorage</code> or <code>sessionStorage</code>. We enforce Cross-Site Request Forgery (CSRF) protections with custom headers on all state-modifying requests.
            </p>
          </section>

          {/* Section 5: Data Deletion Rights */}
          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <Brain className="size-5 text-[#14161f]" />
              <span>5. User Rights & Data Deletion</span>
            </h2>
            <p>
              You maintain full ownership of your academic content. You can permanently delete individual PDFs, flashcard decks, cards, and scheduled tasks at any time from your study dashboard. When a document is deleted, the PDF and its associated summary are removed permanently from storage.
            </p>
            <p>
              To request full account deletion or export your study records, contact our privacy team at{" "}
              <a href="mailto:privacy@sora.study" className="text-ink font-semibold underline">
                privacy@sora.study
              </a>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-display text-muted">
          <p>© 2026 SORA Study Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-ink transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-ink transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
