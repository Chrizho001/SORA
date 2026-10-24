"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface FormattedSummaryProps {
  content: string;
  className?: string;
}

/**
 * Strips Markdown syntax and HTML tags to produce a clean plain-text snippet for cards.
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return "";
  return markdown
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/[-]{3,}/g, " ")
    .replace(/[*_~`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitizes raw HTML tags from AI outputs into clean Markdown before rendering.
 */
function sanitizeAiMarkdown(raw: string): string {
  if (!raw) return "";

  return raw
    // Convert HTML line breaks to real newlines
    .replace(/<br\s*\/?>/gi, "\n")
    // Convert <b> / <strong> to Markdown bold
    .replace(/<\/?(b|strong)>/gi, "**")
    // Convert <i> / <em> to Markdown italic
    .replace(/<\/?(i|em)>/gi, "*")
    // Convert <p> to paragraph break
    .replace(/<p\s*>/gi, "\n\n")
    .replace(/<\/p>/gi, "")
    // Remove container tags like <div>, <span>
    .replace(/<\/?(div|span|section|article)[^>]*>/gi, "")
    // Remove any leftover stray HTML tags (e.g. <font>, <center>)
    .replace(/<(?!\/?(code|pre))[^>]+>/gi, "")
    // Normalize excessive multiple empty lines
    .replace(/\n{3,}/g, "\n\n");
}

export function FormattedSummary({ content, className = "" }: FormattedSummaryProps) {
  const sanitized = useMemo(() => sanitizeAiMarkdown(content), [content]);

  return (
    <div className={`formatted-summary text-ink-2 font-body text-xs sm:text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink mt-6 mb-3 pb-2 border-b border-line first:mt-0 flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base sm:text-lg font-display font-bold text-ink mt-5 mb-2.5 flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#c8f560] inline-block shrink-0" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-display font-bold text-ink mt-4 mb-2 uppercase tracking-wide">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-ink-2 font-body text-xs sm:text-sm">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1 text-xs sm:text-sm text-ink-2 marker:text-emerald-500 font-body">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1 text-xs sm:text-sm text-ink-2 marker:font-bold marker:text-ink font-body">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1 font-body">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-display font-bold text-ink">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-ink-2">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-4 border-l-4 border-[#c8f560] bg-canvas/70 py-2.5 pr-4 rounded-r-2xl text-xs sm:text-sm italic text-muted font-body">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-line shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-canvas border-b border-line text-ink font-display font-bold text-[0.6875rem] uppercase tracking-wider">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-bold text-ink border-r last:border-r-0 border-line/60">
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-line/60 bg-surface text-ink-2 font-body">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-canvas/40 transition-colors">
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-xs leading-relaxed align-top border-r last:border-r-0 border-line/60">
              {children}
            </td>
          ),
          hr: () => <hr className="my-5 border-line" />,
          code: ({ children, className: codeClassName }) => {
            const isBlock = codeClassName?.includes("language-");
            if (isBlock) {
              return (
                <pre className="my-3 p-3.5 rounded-2xl bg-[#14161f] text-[#c8f560] text-xs font-mono overflow-x-auto border border-line">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-canvas border border-line text-[0.85em] font-mono font-medium text-emerald-800">
                {children}
              </code>
            );
          },
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
}
