"use client";

import { useState } from "react";
import { CopyIcon } from "@/components/icons/CopyIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";

// Per DESIGN.md code-snippet-pill: surface-soft bg, font-mono code-md
// in ink, rounded-full, h-code-snippet (48px). A trailing copy button
// swaps to a check on success for ~1.5s. Client Component because of
// the navigator.clipboard call and the transient state.

interface CopyableSnippetProps {
  text: string;
}

export function CopyableSnippet({ text }: CopyableSnippetProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // navigator.clipboard can fail on insecure origins / older
      // browsers — silently no-op; the visible text is the source of
      // truth and users can manually select + copy.
    }
  }

  return (
    <div className="inline-flex h-code-snippet items-center gap-md rounded-full bg-surface-soft px-xl">
      <code className="font-mono text-code-md text-ink">{text}</code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
        className="flex shrink-0 items-center justify-center text-body hover:text-ink"
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      </button>
    </div>
  );
}
