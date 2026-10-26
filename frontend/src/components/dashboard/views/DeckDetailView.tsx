"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Sparkles,
  Zap,
  RotateCw,
  Plus,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Check,
  X,
  BookOpen,
  Info,
} from "lucide-react";
import { Deck, Flashcard } from "@/lib/dashboard-api";
import {
  qk,
  useDocument,
  useUpdateDeck,
  useDeleteDeck,
  useGenerateDeckFlashcards,
  useStartDeckQuiz,
  useCreateFlashcard,
  useUpdateFlashcard,
  useDeleteFlashcard,
} from "@/lib/use-dashboard-queries";
import { useAuth } from "@/lib/auth-context";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notify } from "@/components/auth/ToastProvider";
import { formatApiErrorMessage } from "@/lib/axios-client";

interface DeckDetailViewProps {
  deck: Deck;
  cards: Flashcard[];
  isLoadingCards?: boolean;
  isErrorCards?: boolean;
  onRetryCards?: () => void;
}

// Normalise answers according to the spec: " ".join(a.casefold().split())
function normaliseAnswer(answer: string): string {
  return answer.toLowerCase().trim().split(/\s+/).filter(Boolean).join(" ");
}

export function DeckDetailView({
  deck,
  cards,
  isLoadingCards = false,
  isErrorCards = false,
  onRetryCards,
}: DeckDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<"cards" | "study">("cards");

  // Inline Title Rename
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(deck.title);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Deck Deletion Dialog
  const [isDeleteDeckOpen, setIsDeleteDeckOpen] = useState(false);

  // Generate Flashcards Dialog
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState<number>(10);
  const requestedCountRef = useRef<number | null>(null);

  // Start Quiz Controls
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(10);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);

  // Add Card Form State
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const questionInputRef = useRef<HTMLTextAreaElement>(null);

  // Edit Card Dialog State
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  // Delete Card Dialog State
  const [deletingCard, setDeletingCard] = useState<Flashcard | null>(null);

  // Study Mode State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Mutations
  const updateDeckMutation = useUpdateDeck();
  const deleteDeckMutation = useDeleteDeck();
  const generateFlashcardsMutation = useGenerateDeckFlashcards();
  const startQuizMutation = useStartDeckQuiz();
  const createFlashcardMutation = useCreateFlashcard();
  const updateFlashcardMutation = useUpdateFlashcard();
  const deleteFlashcardMutation = useDeleteFlashcard();

  // FE-07: Poll document while its flashcard_generation_status is GENERATING
  const documentQuery = useDocument(deck.document);
  const prevDocStatusRef = useRef<string | undefined>(undefined);

  const docStatus = documentQuery.data?.flashcard_generation_status;
  const isDocumentGenerating = docStatus === "GENERATING";

  useEffect(() => {
    const prevStatus = prevDocStatusRef.current;
    if (prevStatus === "GENERATING" && docStatus === "DONE") {
      // Invalidate deck cards, deck list, and notifications
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "flashcards", "deck", deck.id) });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "deck", deck.id) });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "decks") });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "notifications") });

      const count = requestedCountRef.current;
      requestedCountRef.current = null;
      notify.success(count ? `${count} cards added` : "Cards added to deck", "Flashcards Ready");
    } else if (prevStatus === "GENERATING" && docStatus === "FAILED") {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "flashcards", "deck", deck.id) });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "deck", deck.id) });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "decks") });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "notifications") });

      requestedCountRef.current = null;
      notify.error("Generation failed — try again", "Generation Failed");
    }

    if (docStatus) {
      prevDocStatusRef.current = docStatus;
    }
  }, [docStatus, queryClient, user?.id, deck.id]);

  // Distinct answers calculation for quiz eligibility
  const distinctAnswersCount = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((card) => {
      const norm = normaliseAnswer(card.answer);
      if (norm) set.add(norm);
    });
    return set.size;
  }, [cards]);

  const hasFewerThan4Cards = cards.length < 4;
  const hasFewerThan4Distinct = distinctAnswersCount < 4;
  const isQuizDisabled = hasFewerThan4Cards || hasFewerThan4Distinct || isStartingQuiz;

  const quizDisabledTooltip = hasFewerThan4Cards
    ? `Need at least 4 flashcards to start a quiz (currently ${cards.length})`
    : hasFewerThan4Distinct
    ? `Need at least 4 flashcards with distinct answers to start a quiz (currently ${distinctAnswersCount})`
    : `Start a speed quiz with ${quizQuestionCount} questions`;

  // Inline rename submit
  const handleSaveTitle = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed.length > 120) {
      setTitleError("Title must be between 1 and 120 characters.");
      return;
    }
    if (trimmed === deck.title) {
      setIsEditingTitle(false);
      setTitleError(null);
      return;
    }

    try {
      await updateDeckMutation.mutateAsync({
        id: deck.id,
        payload: { title: trimmed },
      });
      setIsEditingTitle(false);
      setTitleError(null);
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (
        errorData?.code === "deck_title_taken" ||
        (Array.isArray(errorData?.title) &&
          errorData.title.some((msg: unknown) =>
            typeof msg === "string" && msg.toLowerCase().includes("already exists")
          ))
      ) {
        setTitleError("A deck with this title already exists.");
      } else {
        setTitleError(formatApiErrorMessage(err));
      }
    }
  };

  // Delete Deck
  const handleDeleteDeck = async () => {
    try {
      await deleteDeckMutation.mutateAsync(deck.id);
      router.push("/dashboard/flashcards");
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Failed to Delete Deck");
    }
  };

  // Generate Flashcards
  const handleGenerateFlashcards = async () => {
    try {
      requestedCountRef.current = generateCount;
      await generateFlashcardsMutation.mutateAsync({
        deckId: deck.id,
        count: generateCount,
      });
      setIsGenerateOpen(false);
    } catch (err: unknown) {
      requestedCountRef.current = null;
      notify.error(formatApiErrorMessage(err), "Flashcard Generation Failed");
    }
  };

  // Start Quiz
  const handleStartQuiz = async () => {
    if (isQuizDisabled) return;
    setIsStartingQuiz(true);
    try {
      const session = await startQuizMutation.mutateAsync({
        deckId: deck.id,
        questionCount: quizQuestionCount,
      });
      router.push(`/dashboard/quizzes/${session.id}`);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Unable to Start Quiz");
      setIsStartingQuiz(false);
    }
  };

  // Add Card
  const trimmedNewQ = newQuestion.trim();
  const trimmedNewA = newAnswer.trim();
  const isAddCardValid =
    trimmedNewQ.length >= 1 &&
    trimmedNewQ.length <= 500 &&
    trimmedNewA.length >= 1 &&
    trimmedNewA.length <= 500;

  const handleAddCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAddCardValid || createFlashcardMutation.isPending) return;

    try {
      await createFlashcardMutation.mutateAsync({
        deck: deck.id,
        question: trimmedNewQ,
        answer: trimmedNewA,
      });
      setNewQuestion("");
      setNewAnswer("");
      // Return focus to question input for fast entry
      setTimeout(() => {
        questionInputRef.current?.focus();
      }, 30);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Failed to Add Card");
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAddCard();
    }
  };

  // Edit Card
  const openEditCard = (card: Flashcard) => {
    setEditingCard(card);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    const trimmedQ = editQuestion.trim();
    const trimmedA = editAnswer.trim();
    if (
      trimmedQ.length < 1 ||
      trimmedQ.length > 500 ||
      trimmedA.length < 1 ||
      trimmedA.length > 500
    ) {
      return;
    }

    try {
      await updateFlashcardMutation.mutateAsync({
        id: editingCard.id,
        payload: { question: trimmedQ, answer: trimmedA, deck: deck.id },
      });
      setEditingCard(null);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Failed to Update Card");
    }
  };

  // Delete Card
  const handleDeleteCard = async () => {
    if (!deletingCard) return;
    try {
      await deleteFlashcardMutation.mutateAsync({
        id: deletingCard.id,
        deckId: deck.id,
      });
      setDeletingCard(null);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Failed to Delete Card");
    }
  };

  // Guard against currentIndex >= cards.length (Study mode bug guard)
  const safeIndex = cards.length > 0 ? Math.min(currentIndex, cards.length - 1) : 0;
  const currentStudyCard = cards.length > 0 ? cards[safeIndex] : null;

  const handleNextStudy = () => {
    setIsFlipped(false);
    if (cards.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }
  };

  const handlePrevStudy = () => {
    setIsFlipped(false);
    if (cards.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }
  };

  const handleShuffleStudy = () => {
    setIsFlipped(false);
    if (cards.length > 1) {
      let rand = Math.floor(Math.random() * cards.length);
      if (rand === safeIndex) {
        rand = (rand + 1) % cards.length;
      }
      setCurrentIndex(rand);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/flashcards"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors border border-line/60"
        >
          <ArrowLeft className="size-3.5" />
          <span>All Decks</span>
        </Link>
      </div>

      {/* Deck Header & Title Inline Rename */}
      <div className="rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => {
                      setTitleInput(e.target.value);
                      if (titleError) setTitleError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveTitle();
                      } else if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setTitleError(null);
                        setTitleInput(deck.title);
                      }
                    }}
                    autoFocus
                    maxLength={120}
                    className="h-10 px-3.5 rounded-xl bg-canvas border border-line text-base font-display font-bold text-ink focus:outline-none focus:ring-2 focus:ring-ink flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    disabled={updateDeckMutation.isPending}
                    className="size-10 rounded-xl bg-night hover:bg-ink text-[#c8f560] flex items-center justify-center shrink-0 transition-transform active:scale-95 disabled:opacity-50"
                    title="Save title (Enter)"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTitle(false);
                      setTitleError(null);
                      setTitleInput(deck.title);
                    }}
                    className="size-10 rounded-xl bg-canvas hover:bg-mist text-muted flex items-center justify-center shrink-0 transition-colors border border-line"
                    title="Cancel (Esc)"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {titleError && (
                  <p className="text-[0.6875rem] text-rose-600 font-body flex items-center gap-1">
                    <AlertCircle className="size-3 shrink-0" />
                    <span>{titleError}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
                  {deck.title}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-mist transition-colors"
                  title="Rename deck"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            )}

            {deck.description && (
              <p className="text-xs sm:text-sm text-muted font-body leading-relaxed max-w-2xl">
                {deck.description}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-muted font-display">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                {cards.length} {cards.length === 1 ? "card" : "cards"}
              </span>

              {deck.document && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-canvas text-muted border border-line">
                  <FileText className="size-3" />
                  <span>from {deck.document_name || "Linked Document"}</span>
                </span>
              )}

              {isDocumentGenerating && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-semibold animate-pulse">
                  <RotateCw className="size-3 animate-spin" />
                  <span>AI generating cards...</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: Generate with AI, Start Quiz, Delete */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {deck.document && (
              <button
                type="button"
                onClick={() => setIsGenerateOpen(true)}
                disabled={isDocumentGenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-display font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isDocumentGenerating ? (
                  <RotateCw className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span>{isDocumentGenerating ? "Generating..." : "Generate with AI"}</span>
              </button>
            )}

            {/* Start Quiz with count selector */}
            <div className="inline-flex items-center rounded-xl bg-canvas border border-line p-0.5">
              <select
                value={quizQuestionCount}
                onChange={(e) => setQuizQuestionCount(Number(e.target.value))}
                disabled={isQuizDisabled}
                aria-label="Quiz question count"
                className="h-8 pl-2 pr-1 rounded-lg bg-transparent text-xs font-display font-semibold text-ink focus:outline-none disabled:opacity-40"
              >
                <option value={5}>5 Qs</option>
                <option value={10}>10 Qs</option>
                <option value={20}>20 Qs</option>
              </select>

              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={isQuizDisabled}
                title={quizDisabledTooltip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <Zap className="size-3.5 text-amber-400" />
                <span>{isStartingQuiz ? "Starting..." : "Start Quiz"}</span>
              </button>
            </div>

            {/* Delete Deck button */}
            <button
              type="button"
              onClick={() => setIsDeleteDeckOpen(true)}
              className="p-2 rounded-xl text-subtle hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
              title="Delete Deck"
              aria-label="Delete Deck"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {/* Quiz disabled helper message if deck doesn't have 4 distinct cards */}
        {hasFewerThan4Cards ? (
          <div className="p-3 rounded-2xl bg-canvas border border-line/80 text-[0.6875rem] font-body text-muted flex items-center gap-2">
            <Info className="size-3.5 text-muted shrink-0" />
            <span>
              Quizzes require at least <strong>4 flashcards</strong> in this deck (currently {cards.length}). Add more cards or generate them with AI to unlock quizzes!
            </span>
          </div>
        ) : hasFewerThan4Distinct ? (
          <div className="p-3 rounded-2xl bg-canvas border border-line/80 text-[0.6875rem] font-body text-muted flex items-center gap-2">
            <Info className="size-3.5 text-muted shrink-0" />
            <span>
              Quizzes require at least <strong>4 distinct answers</strong> to create multiple choice options (currently {distinctAnswersCount} distinct). Add distinct cards to enable speed quizzes.
            </span>
          </div>
        ) : null}
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-line pb-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "cards"}
          onClick={() => setActiveTab("cards")}
          className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
            activeTab === "cards"
              ? "bg-night text-[#c8f560] shadow-sm"
              : "text-muted hover:text-ink hover:bg-mist"
          }`}
        >
          <span>Cards ({cards.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "study"}
          onClick={() => {
            setActiveTab("study");
            setIsFlipped(false);
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
            activeTab === "study"
              ? "bg-night text-[#c8f560] shadow-sm"
              : "text-muted hover:text-ink hover:bg-mist"
          }`}
        >
          <BookOpen className="size-3.5" />
          <span>Study Mode</span>
        </button>
      </div>

      {/* TAB 1: Cards Tab */}
      {activeTab === "cards" && (
        <div className="space-y-6">
          {/* Add Card Form */}
          <form
            onSubmit={handleAddCard}
            className="rounded-3xl bg-surface border border-line p-5 shadow-soft space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Plus className="size-4" />
                </div>
                <h3 className="font-display font-bold text-sm text-ink">Add Flashcard</h3>
              </div>
              <span className="text-[0.6875rem] text-muted font-display">
                Press <kbd className="px-1.5 py-0.5 rounded bg-canvas border border-line text-[0.625rem]">Ctrl+Enter</kbd> to submit
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="card-question" className="text-xs font-display font-semibold text-ink">
                    Question / Prompt <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[0.6875rem] text-muted font-display">
                    {newQuestion.trim().length}/500
                  </span>
                </div>
                <textarea
                  id="card-question"
                  ref={questionInputRef}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="e.g. What is the Law of Demand?"
                  maxLength={500}
                  rows={3}
                  required
                  className="w-full p-3 rounded-2xl bg-canvas border border-line text-xs font-body text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="card-answer" className="text-xs font-display font-semibold text-ink">
                    Answer <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[0.6875rem] text-muted font-display">
                    {newAnswer.trim().length}/500
                  </span>
                </div>
                <textarea
                  id="card-answer"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="e.g. As price increases, quantity demanded decreases, ceteris paribus."
                  maxLength={500}
                  rows={3}
                  required
                  className="w-full p-3 rounded-2xl bg-canvas border border-line text-xs font-body text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={!isAddCardValid || createFlashcardMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="size-3.5" />
                <span>{createFlashcardMutation.isPending ? "Adding..." : "Add Card"}</span>
              </button>
            </div>
          </form>

          {/* Cards List */}
          {isLoadingCards ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-canvas animate-pulse" />
              ))}
            </div>
          ) : isErrorCards ? (
            <div className="rounded-2xl bg-surface border border-rose-200 p-8 text-center space-y-3 shadow-soft">
              <AlertCircle className="size-8 text-rose-500 mx-auto" />
              <p className="font-display font-bold text-sm text-ink">Failed to load deck cards</p>
              {onRetryCards && (
                <button
                  type="button"
                  onClick={onRetryCards}
                  className="px-4 py-2 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-all"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-3xl bg-surface border border-line p-10 text-center space-y-3 shadow-soft">
              <div className="size-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                <BookOpen className="size-6" />
              </div>
              <h3 className="font-display font-bold text-base text-ink">No flashcards in this deck</h3>
              <p className="text-xs text-muted max-w-sm mx-auto font-body">
                Use the form above to add manual cards, or click &quot;Generate with AI&quot; to build cards from your lecture PDF!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  className="rounded-2xl bg-surface border border-line hover:border-line/80 p-4 shadow-soft transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.6875rem] font-display font-bold text-muted px-2 py-0.5 rounded-md bg-canvas border border-line">
                        #{index + 1}
                      </span>
                      {card.source === "AI" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[0.625rem] font-display font-bold">
                          <Sparkles className="size-2.5" />
                          <span>AI Generated</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas text-muted border border-line text-[0.625rem] font-display font-semibold">
                          <span>Manual</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditCard(card)}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-mist transition-colors"
                        title="Edit flashcard"
                        aria-label={`Edit card ${index + 1}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCard(card)}
                        className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete flashcard"
                        aria-label={`Delete card ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[0.6875rem] font-display font-semibold text-muted block uppercase tracking-wider">
                        Question
                      </span>
                      <p className="font-body text-ink leading-relaxed whitespace-pre-wrap">
                        {card.question}
                      </p>
                    </div>

                    <div className="space-y-1 md:border-l md:border-line md:pl-3">
                      <span className="text-[0.6875rem] font-display font-semibold text-muted block uppercase tracking-wider">
                        Answer
                      </span>
                      <p className="font-body text-ink-2 leading-relaxed whitespace-pre-wrap">
                        {card.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Study Mode Tab */}
      {activeTab === "study" && (
        <div className="space-y-6 max-w-xl mx-auto">
          {cards.length === 0 ? (
            <div className="rounded-3xl bg-surface border border-line p-10 text-center space-y-4 shadow-soft">
              <div className="size-14 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                <BookOpen className="size-7" />
              </div>
              <h3 className="font-display font-bold text-base text-ink">
                No flashcards in this deck yet
              </h3>
              <p className="text-xs text-muted max-w-sm mx-auto font-body">
                Add your first flashcards in the Cards tab to begin active recall practice!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("cards")}
                className="px-4 py-2 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-transform active:scale-95 shadow-sm"
              >
                Go to Cards
              </button>
            </div>
          ) : currentStudyCard ? (
            <div className="space-y-5">
              {/* Header Controls: Progress & Shuffle */}
              <div className="flex items-center justify-between text-xs font-display text-muted px-2">
                <span>
                  Card <strong>{safeIndex + 1}</strong> of <strong>{cards.length}</strong>
                </span>

                <button
                  type="button"
                  onClick={handleShuffleStudy}
                  className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                >
                  <Shuffle className="size-3.5" />
                  <span>Shuffle</span>
                </button>
              </div>

              {/* Interactive Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setIsFlipped(!isFlipped);
                  }
                }}
                className="relative min-h-[280px] rounded-3xl bg-surface border-2 border-line hover:border-purple-300 p-8 shadow-lift cursor-pointer flex flex-col justify-between transition-all select-none group"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold ${
                      isFlipped
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-purple-50 text-purple-800 border border-purple-200"
                    }`}
                  >
                    {isFlipped ? "Answer" : "Question"}
                  </span>

                  <span className="text-[0.6875rem] font-display text-muted group-hover:text-ink transition-colors">
                    Click or Space to flip
                  </span>
                </div>

                <div className="py-6 my-auto text-center">
                  <p className="font-display font-bold text-lg sm:text-xl text-ink leading-relaxed whitespace-pre-wrap">
                    {isFlipped ? currentStudyCard.answer : currentStudyCard.question}
                  </p>
                </div>

                <div className="text-center text-[0.6875rem] font-display text-muted">
                  {isFlipped ? "Showing Answer" : "Tap card to reveal answer"}
                </div>
              </div>

              {/* Study Navigation Buttons */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={handlePrevStudy}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-line text-xs font-display font-bold text-ink hover:bg-mist transition-colors shadow-soft active:scale-95"
                >
                  <ChevronLeft className="size-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-5 py-2.5 rounded-full bg-canvas border border-line text-xs font-display font-semibold text-ink hover:bg-mist transition-colors"
                >
                  {isFlipped ? "Show Question" : "Reveal Answer"}
                </button>

                <button
                  type="button"
                  onClick={handleNextStudy}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all shadow-md active:scale-95"
                >
                  <span>Next</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Delete Deck Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDeckOpen}
        onClose={() => setIsDeleteDeckOpen(false)}
        onConfirm={handleDeleteDeck}
        title="Delete Deck"
        description={`Are you sure you want to delete "${deck.title}"? All ${cards.length} flashcards in this deck will be permanently removed. Past quiz history will be preserved.`}
        confirmLabel="Delete Deck"
        isDestructive
        isLoading={deleteDeckMutation.isPending}
      />

      {/* Generate Flashcards Dialog */}
      <Dialog
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate Flashcards with AI"
        description="SORA AI analyzes your linked document summary and adds smart active recall flashcards to this deck."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-display font-semibold text-ink block mb-2">
              Number of cards to generate:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[5, 10, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setGenerateCount(count)}
                  className={`py-3 px-3 rounded-2xl text-xs font-display font-bold border transition-all text-center ${
                    generateCount === count
                      ? "bg-purple-50 border-purple-600 text-purple-900 shadow-xs"
                      : "bg-canvas border-line text-muted hover:border-line/80 hover:text-ink"
                  }`}
                >
                  <span className="text-base font-bold block">{count}</span>
                  <span className="text-[0.625rem] text-muted">cards</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[0.6875rem] text-muted font-body">
            Generated cards append to this deck with an AI badge and never overwrite your manual cards.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              disabled={generateFlashcardsMutation.isPending}
              className="px-4 py-2 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateFlashcards}
              disabled={generateFlashcardsMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-display font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" />
              <span>
                {generateFlashcardsMutation.isPending ? "Starting..." : `Generate ${generateCount} Cards`}
              </span>
            </button>
          </div>
        </div>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
        title="Edit Flashcard"
      >
        <form onSubmit={handleUpdateCard} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="edit-question" className="text-xs font-display font-semibold text-ink">
                Question <span className="text-rose-500">*</span>
              </label>
              <span className="text-[0.6875rem] text-muted font-display">
                {editQuestion.trim().length}/500
              </span>
            </div>
            <textarea
              id="edit-question"
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
              maxLength={500}
              rows={3}
              required
              className="w-full p-3 rounded-2xl bg-canvas border border-line text-xs font-body text-ink focus:outline-none focus:ring-2 focus:ring-ink resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="edit-answer" className="text-xs font-display font-semibold text-ink">
                Answer <span className="text-rose-500">*</span>
              </label>
              <span className="text-[0.6875rem] text-muted font-display">
                {editAnswer.trim().length}/500
              </span>
            </div>
            <textarea
              id="edit-answer"
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
              maxLength={500}
              rows={3}
              required
              className="w-full p-3 rounded-2xl bg-canvas border border-line text-xs font-body text-ink focus:outline-none focus:ring-2 focus:ring-ink resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => setEditingCard(null)}
              disabled={updateFlashcardMutation.isPending}
              className="px-4 py-2 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                editQuestion.trim().length < 1 ||
                editQuestion.trim().length > 500 ||
                editAnswer.trim().length < 1 ||
                editAnswer.trim().length > 500 ||
                updateFlashcardMutation.isPending
              }
              className="px-4 py-2 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {updateFlashcardMutation.isPending ? "Saving..." : "Save Card"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Card Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCard}
        onClose={() => setDeletingCard(null)}
        onConfirm={handleDeleteCard}
        title="Delete Flashcard"
        description="Are you sure you want to delete this flashcard? This action cannot be undone."
        confirmLabel="Delete Card"
        isDestructive
        isLoading={deleteFlashcardMutation.isPending}
      />
    </div>
  );
}
