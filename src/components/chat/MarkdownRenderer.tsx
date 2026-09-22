'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="text-sm leading-relaxed space-y-3 text-slate-200">
      {parseMarkdownBlocks(content)}
    </div>
  );
};

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-[#22293d] bg-[#07090e]">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0e121b] border-b border-[#1c2234] text-[11px] font-mono text-slate-400">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-slate-200 transition text-[10px]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-emerald-300 leading-normal scrollbar-none">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Regex to split by bold (**), code (`), italic (* or _)
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **...**
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={key++} className="font-bold text-white">
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Inline code: `...`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-[#131826] border border-[#242c42] text-emerald-400 font-mono text-xs"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Italic: *...*
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      tokens.push(
        <em key={key++} className="italic text-slate-300">
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Regular character slice until next special symbol
    const nextSpecial = remaining.search(/[\*_`]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Fallback for dangling symbol
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens;
}

function parseMarkdownBlocks(rawText: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  const lines = rawText.split('\n');
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <CodeBlock key={blockKey++} code={codeLines.join('\n')} language={language} />
      );
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      blocks.push(
        <h4 key={blockKey++} className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase mt-3 mb-1">
          {renderInline(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={blockKey++} className="text-sm font-bold text-slate-100 mt-3 mb-1 border-b border-[#1b2234] pb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={blockKey++} className="text-base font-bold text-white mt-4 mb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={blockKey++} className="text-lg font-extrabold text-white mt-4 mb-2">
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push(
        <blockquote
          key={blockKey++}
          className="border-l-2 border-emerald-500/70 pl-3 py-1 my-1 text-slate-300 italic text-xs bg-emerald-950/20 rounded-r"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Bullet Lists (- or *)
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={blockKey++} className="space-y-1.5 my-2 pl-4 list-disc marker:text-emerald-400">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-slate-200">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered Lists (1. 2.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={blockKey++} className="space-y-1.5 my-2 pl-4 list-decimal marker:text-emerald-400 font-mono text-xs">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-slate-200 font-sans text-sm">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Normal paragraph
    blocks.push(
      <p key={blockKey++} className="my-1.5">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return blocks;
}
