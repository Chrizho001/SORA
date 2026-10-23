"use client";

import React, { useState } from "react";
import {
  Search,
  Sparkles,
  BookOpen,
  Brain,
  Zap,
  ArrowRight,
  Flame,
} from "lucide-react";
import { SoraMascot } from "@/components/auth/SoraMascot";
import { MascotGuide } from "../MascotGuide";
import { StudyActivityChart } from "../StudyActivityChart";
import { DailySchedule } from "../DailySchedule";
import { MiniCalendar } from "../MiniCalendar";
import { ActiveStudyMaterials } from "../ActiveStudyMaterials";
import { AssignmentsBoard } from "../AssignmentsBoard";
import { DocumentItem, TaskItem, QuizSession, FlashcardItem } from "@/lib/dashboard-api";
import { User } from "@/lib/auth-api";
import { DashboardTab } from "../Sidebar";

interface DashboardHomeViewProps {
  user: User;
  documents: DocumentItem[];
  tasks: TaskItem[];
  flashcards: FlashcardItem[];
  quizSessions: QuizSession[];
  onUploadClick: () => void;
  onAddTaskClick: () => void;
  onToggleTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onGenerateFlashcards: (docId: string) => void;
  onStartQuiz: (docId: string) => void;
  onViewDocument: (doc: DocumentItem) => void;
  onNavigateTab: (tab: DashboardTab) => void;
}

export function DashboardHomeView({
  user,
  documents,
  tasks,
  flashcards,
  quizSessions,
  onUploadClick,
  onAddTaskClick,
  onToggleTask,
  onDeleteTask,
  onGenerateFlashcards,
  onStartQuiz,
  onViewDocument,
  onNavigateTab,
}: DashboardHomeViewProps) {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate statistics
  const totalSummarizedDocs = documents.filter((d) => d.status === "DONE").length;
  const totalCards = flashcards.length;
  const averageQuizScore =
    quizSessions.length > 0
      ? Math.round(
          quizSessions.reduce((acc, q) => acc + (q.score ?? 0), 0) /
            Math.max(1, quizSessions.reduce((acc, q) => acc + (q.total_questions || 1), 0)) *
            100
        )
      : 85;

  // Filter items by search query if present
  const displayedDocuments = documents.filter((d) =>
    searchQuery ? d.original_name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const displayedTasks = tasks.filter((t) =>
    searchQuery ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Top Welcome Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
              Welcome back, {user.first_name || "Student"}! 👋
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-display font-semibold">
              <Flame className="size-3 text-amber-600" />
              <span>3-day streak</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Your lecture summaries, flashcard decks, and quiz milestones are active.
          </p>
        </div>

        {/* Global Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, tasks, cards..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-surface border border-line text-xs font-body text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Mascot Guideline Banner for Dashboard Overview */}
      <MascotGuide
        section="overview"
        userName={user.first_name}
        onActionClick={onUploadClick}
        actionLabel="Upload Lecture PDF"
      />

      {/* Top 4 Quick Stats & AI Guide Cards (inspired by 'New Courses' & 'Go Premium' card in design/dashboard.webp) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Summarized Documents */}
        <div className="rounded-3xl bg-surface border border-line p-5 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="size-11 rounded-2xl bg-[#ffedd5] text-[#ea580c] flex items-center justify-center shadow-xs">
              <BookOpen className="size-5.5" />
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("documents")}
              className="text-subtle hover:text-ink text-xs font-display flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-display font-bold text-ink">
                {totalSummarizedDocs || documents.length}
              </p>
              <span className="text-[0.6875rem] font-display font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h4 className="font-display font-bold text-sm text-ink">Lecture Summaries</h4>
            <p className="text-xs text-muted font-body">Extracted with chapter key takeaways</p>
          </div>
        </div>

        {/* Card 2: Smart Flashcards */}
        <div className="rounded-3xl bg-surface border border-line p-5 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="size-11 rounded-2xl bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shadow-xs">
              <Brain className="size-5.5" />
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("flashcards")}
              className="text-subtle hover:text-ink text-xs font-display flex items-center gap-1"
            >
              <span>Review</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-display font-bold text-ink">{totalCards || 24}</p>
              <span className="text-[0.6875rem] font-display font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Spaced Recall
              </span>
            </div>
            <h4 className="font-display font-bold text-sm text-ink">Flashcards Mastered</h4>
            <p className="text-xs text-muted font-body">Ready for daily memory repetition</p>
          </div>
        </div>

        {/* Card 3: Speed Quizzes Performance */}
        <div className="rounded-3xl bg-surface border border-line p-5 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="size-11 rounded-2xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shadow-xs">
              <Zap className="size-5.5" />
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("quizzes")}
              className="text-subtle hover:text-ink text-xs font-display flex items-center gap-1"
            >
              <span>Quizzes</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-display font-bold text-ink">{averageQuizScore}%</p>
              <span className="text-[0.6875rem] font-display font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                Avg Score
              </span>
            </div>
            <h4 className="font-display font-bold text-sm text-ink">Speed Quizzes</h4>
            <p className="text-xs text-muted font-body">
              {quizSessions.length} session{quizSessions.length === 1 ? "" : "s"} completed
            </p>
          </div>
        </div>

        {/* Card 4: SORA Study Helper Card (inspired by 'Go Premium' card in design/dashboard.webp) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161720] via-[#1a1c27] to-[#12131a] border border-[#2a2d3d] p-5 text-white shadow-lift flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-xs font-display font-bold text-[#c8f560]">
              <Sparkles className="size-3.5" />
              <span>SORA Smart Study</span>
            </div>
            <span className="size-2 rounded-full bg-[#c8f560] animate-pulse" />
          </div>

          <div className="my-2 flex items-center gap-3">
            <div className="shrink-0 -my-2 -ml-2">
              <SoraMascot
                size="sm"
                emotion="happy"
                showSpeechBubble={false}
                className="scale-65 origin-left"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-display font-bold text-white leading-tight">
                Exam Mode Active
              </p>
              <p className="text-[0.6875rem] text-gray-400 font-body mt-0.5">
                Upload a lecture slide to generate test questions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onUploadClick}
            className="w-full h-8 rounded-xl bg-[#c8f560] hover:bg-[#b8ea4b] text-[#141413] text-xs font-display font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span>Upload Document</span>
            <ArrowRight className="size-3" />
          </button>
        </div>
      </section>

      {/* Middle Section: Study Activity Chart, Daily Schedule & Mini Calendar (3-Column Layout from design/dashboard.webp) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Hours Activity Chart (5 cols) */}
        <div className="lg:col-span-5">
          <StudyActivityChart className="h-full" />
        </div>

        {/* Daily Schedule (3.5 cols) */}
        <div className="lg:col-span-4">
          <DailySchedule
            tasks={displayedTasks}
            onToggleTask={onToggleTask}
            onAddTaskClick={onAddTaskClick}
            className="h-full"
          />
        </div>

        {/* Interactive Mini Calendar (3.5 cols) */}
        <div className="lg:col-span-3">
          <MiniCalendar
            tasks={tasks}
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
            onAddTaskClick={onAddTaskClick}
            className="h-full"
          />
        </div>
      </section>

      {/* Bottom Section: Active Study Materials & Assignments Board (2-Column Layout from design/dashboard.webp) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Active Study Materials (7 cols) */}
        <div className="lg:col-span-7">
          <ActiveStudyMaterials
            documents={displayedDocuments}
            onUploadClick={onUploadClick}
            onGenerateFlashcards={onGenerateFlashcards}
            onStartQuiz={onStartQuiz}
            onViewDocument={onViewDocument}
            className="h-full"
          />
        </div>

        {/* Assignments & Tasks Board (5 cols) */}
        <div className="lg:col-span-5">
          <AssignmentsBoard
            tasks={displayedTasks}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onAddTaskClick={onAddTaskClick}
            selectedDateFilter={selectedCalendarDate}
            className="h-full"
          />
        </div>
      </section>
    </div>
  );
}
