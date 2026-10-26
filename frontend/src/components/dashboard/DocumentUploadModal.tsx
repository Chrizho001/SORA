"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { SoraMascot } from "@/components/auth/SoraMascot";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { Dialog } from "@/components/ui/Dialog";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, onProgress?: (percent: number) => void) => Promise<unknown>;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUpload,
}: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Validate PDF type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported (.pdf). Please choose a valid lecture slide deck, reading guide, or notes.");
      return;
    }

    // Validate size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`This file is ${sizeMb}MB, which exceeds the 10MB limit. Please compress or split the document.`);
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
      setError("Please select a PDF file first before starting analysis.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      await onUpload(selectedFile, (percent) => {
        setUploadProgress(percent);
      });
      setSelectedFile(null);
      setError(null);
      setUploadProgress(0);
      onClose();
    } catch (err: unknown) {
      setError(formatApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setError(null);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Lecture PDF"
      description="Multimodal AI analysis for lecture slides, notes, diagrams, and readings"
      headerPrefix={
        <div className="size-10 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold shrink-0">
          <UploadCloud className="size-5" />
        </div>
      }
    >
      <div className="space-y-5">
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
              <span>SORA Multimodal AI</span>
            </p>
            <p className="text-muted">
              I can read slides with charts, math formulas, scanned textbook pages, and lecture diagrams!
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-display font-semibold text-rose-900">Upload Issue</p>
              <p className="text-rose-700 leading-relaxed font-body">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-700 text-xs font-display font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Accessible Drag and Drop Zone with <label htmlFor="pdf-input"> and <input id="pdf-input" ... className="sr-only"> */}
        <label
          htmlFor="pdf-input"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`block border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
            isDragging
              ? "border-[#c8f560] bg-[#c8f560]/10 scale-[1.01]"
              : selectedFile
              ? "border-emerald-300 bg-emerald-50/30"
              : "border-line-strong hover:border-ink hover:bg-canvas/50"
          } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
        >
          <input
            id="pdf-input"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
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
              {!isUploading && (
                <span className="text-[0.6875rem] text-emerald-700 font-display font-medium underline">
                  Click or drag to change file
                </span>
              )}
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
                Standard & scanned PDFs supported
              </span>
            </>
          )}
        </label>

        {/* Upload Progress Bar (FE-20) */}
        {isUploading && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-canvas border border-line animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-display">
              <span className="text-muted flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin text-[#141413]" />
                <span>
                  {uploadProgress < 100
                    ? "Uploading PDF to server..."
                    : "Processing lecture upload..."}
                </span>
              </span>
              <span className="font-bold text-ink">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-line/60 overflow-hidden">
              <div
                className="h-full bg-[#c8f560] transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(5, uploadProgress)}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between">
          {error && selectedFile && !isUploading ? (
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-display"
            >
              <RotateCcw className="size-3.5" />
              <span>Choose different file</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl border border-line text-xs font-display font-semibold text-muted hover:text-ink hover:bg-mist transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={!selectedFile || isUploading}
              className="px-5 py-2.5 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold shadow-md transition-transform active:scale-95 disabled:opacity-40 inline-flex items-center gap-2"
            >
              {isUploading && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isUploading ? "Uploading..." : "Start AI Summary"}</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
