"use client";

import React, { useRef, useState } from "react";
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { SoraMascot } from "@/components/auth/SoraMascot";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<unknown>;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUpload,
}: DocumentUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Validate PDF type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported (e.g. lecture_01.pdf).");
      return;
    }

    // Validate size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds the 10MB size limit. Please upload a smaller PDF.");
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setError("Please select a PDF file first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-line p-6 shadow-2xl text-ink space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold">
              <UploadCloud className="size-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Upload Lecture PDF</h3>
              <p className="text-xs text-muted font-body">
                Turn your course document into summaries, flashcards, and quizzes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mascot Helper Note */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-canvas border border-line">
          <SoraMascot
            size="sm"
            emotion="happy"
            showSpeechBubble={false}
            className="scale-75 -my-4 -ml-2 shrink-0"
          />
          <div className="space-y-0.5 text-xs font-body text-ink-2">
            <p className="font-semibold text-ink flex items-center gap-1">
              <Sparkles className="size-3 text-amber-500" />
              <span>SORA AI Processing</span>
            </p>
            <p className="text-muted">
              Drop lecture slides, chapter readings, or exam notes. I&apos;ll read every page!
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
            isDragging
              ? "border-[#c8f560] bg-[#c8f560]/10 scale-[1.01]"
              : selectedFile
              ? "border-emerald-300 bg-emerald-50/30"
              : "border-line-strong hover:border-ink hover:bg-canvas/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="space-y-2">
              <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="size-6" />
              </div>
              <p className="font-display font-bold text-sm text-ink truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted font-body">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
              </p>
              <span className="text-[0.6875rem] text-emerald-700 font-display font-medium underline">
                Click to change file
              </span>
            </div>
          ) : (
            <>
              <div className="size-12 rounded-2xl bg-canvas text-ink mx-auto flex items-center justify-center border border-line">
                <FileText className="size-6 text-muted" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-semibold text-sm text-ink">
                  Drag and drop your PDF here
                </p>
                <p className="text-xs text-muted font-body">
                  or click to browse your computer (Max: 10MB)
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-canvas text-[0.6875rem] font-display font-medium text-muted border border-line">
                Standard PDF only
              </span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl border border-line text-xs font-display font-semibold text-muted hover:text-ink hover:bg-mist transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={!selectedFile || isUploading}
            className="px-5 py-2.5 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold shadow-md transition-transform active:scale-95 disabled:opacity-40"
          >
            {isUploading ? "Uploading & Analyzing..." : "Start AI Summary"}
          </button>
        </div>
      </div>
    </div>
  );
}
