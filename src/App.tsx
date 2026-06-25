import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  User,
  Bot,
  LogOut,
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  X,
  FileText,
  Loader2,
  Sparkles,
  Zap,
  Copy,
  Check,
  Menu,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Attachment {
  name: string;
  content: string;
  type: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Configurable API URL (placeholder)                                 */
/* ------------------------------------------------------------------ */

const API_URL = import.meta.env.VITE_CHAT_API_URL || '';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(text: string): string {
  let html = text;

  // fenced code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    const badge = lang ? `<div class="cb-lang">${escapeHtml(lang)}</div>` : '';
    return `<div class="cb-block">${badge}<pre><code>${escapeHtml(code)}</code></pre></div>`;
  });

  // inline code
  html = html.replace(/`([^`]+)`/g, '<code class="cb-inline">$1</code>');

  // headings
  html = html.replace(/^###### (.*$)/gim, '<h6 class="cb-h6">$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5 class="cb-h5">$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="cb-h4">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="cb-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="cb-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="cb-h1">$1</h1>');

  // bold / italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // blockquote
  html = html.replace(/^> (.*$)/gim, '<blockquote class="cb-bq">$1</blockquote>');

  // unordered list items
  html = html.replace(/^(\s*)[-*+] (.*$)/gim, '<li class="cb-li">$2</li>');
  html = html.replace(/(<li class="cb-li">.*?<\/li>\n?)+/gs, (m) => `<ul class="cb-ul">${m}</ul>`);

  // horizontal rule
  html = html.replace(/^---$/gim, '<hr class="cb-hr" />');

  // table
  html = html.replace(/\|(.+?)\|\n\|[\-:\s|]+\|\n((?:\|.+?\|\n?)+)/g, (_m, header, rows) => {
    const ths = header.split('|').map((h: string) => h.trim()).filter(Boolean);
    const thHtml = `<tr>${ths.map((h: string) => `<th class="cb-th">${escapeHtml(h)}</th>`).join('')}</tr>`;
    const rowLines = rows.trim().split('\n');
    const trHtml = rowLines.map((line: string) => {
      const cells = line.split('|').map((c: string) => c.trim()).filter(Boolean);
      return `<tr>${cells.map((c: string) => `<td class="cb-td">${escapeHtml(c)}</td>`).join('')}</tr>`;
    }).join('');
    return `<table class="cb-table">${thHtml}${trHtml}</table>`;
  });

  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="cb-link" target="_blank" rel="noopener">$1</a>');

  // paragraphs
  html = html.replace(/\n\n/g, '</p><p class="cb-p">');
  html = html.replace(/^(.+)$/gim, '<p class="cb-p">$1</p>');

  // cleanup
  html = html.replace(/<p class="cb-p"><(h[1-6]|ul|blockquote|pre|table|hr|div)/g, '<$1');
  html = html.replace(/<\/(h[1-6]|ul|blockquote|pre|table|hr|div)><\/p>/g, '</$1>');
  html = html.replace(/<p class="cb-p"><\/p>/g, '');

  return html;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MarkdownView({ content }: { content: string }) {
  const html = renderMarkdown(content);
  return <div className="cb-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

function AttachmentBadge({
  att,
  onRemove,
}: {
  att: Attachment;
  onRemove?: () => void;
}) {
  const isText =
    att.type === 'text/plain' ||
    att.type === 'text/markdown' ||
    att.name.endsWith('.md') ||
    att.name.endsWith('.txt');
  return (
    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] text-slate-600">
      <FileText className="w-3 h-3 text-uob-blue shrink-0" />
      <span className="truncate max-w-[140px]">{att.name}</span>
      <span className="text-slate-400">({isText ? 'text' : att.type.split('/')[1] || 'file'})</span>
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 text-slate-400 hover:text-red-500">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex gap-2.5 px-3 py-2 ${isUser ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-50/80 transition-colors`}>
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300">
            <User className="w-3 h-3 text-slate-500" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-uob-blue/10 flex items-center justify-center border border-uob-blue/20">
            <Bot className="w-3 h-3 text-uob-blue" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[11px] font-semibold ${isUser ? 'text-slate-500' : 'text-uob-blue'}`}>
            {isUser ? 'You' : 'PulseAI'}
          </span>
          <span className="text-[10px] text-slate-400">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && (
            <button
              onClick={copyText}
              className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {msg.attachments.map((att) => (
              <AttachmentBadge key={att.name} att={att} />
            ))}
          </div>
        )}

        <div className="text-[13px] text-slate-800 leading-relaxed">
          <MarkdownView content={msg.content} />
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  collapsed,
  onToggle,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <div className="w-9 border-r border-slate-200 bg-white flex flex-col items-center py-2 shrink-1">
        <button onClick={onToggle} className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 mb-2" title="Expand">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onNew} className="p-1 text-slate-400 hover:text-uob-blue rounded hover:bg-slate-100" title="New chat">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 border-r border-slate-200 bg-white flex flex-col shrink-1">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200">
        <button
          onClick={onNew}
          className="flex items-center gap-2 flex-1 px-2 py-1 text-[13px] font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded transition-colors border border-slate-200"
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
        </button>
        <button onClick={onToggle} className="p-1 ml-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100" title="Collapse">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 && (
          <div className="px-3 py-5 text-center">
            <p className="text-[11px] text-slate-400">No chats yet</p>
          </div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 mx-1 px-2 py-1 rounded cursor-pointer transition-colors ${
              activeId === c.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            onClick={() => onSelect(c.id)}
          >
            <MessageSquare className="w-3 h-3 shrink-0 opacity-50" />
            <span className="text-[12px] truncate flex-1">{c.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 rounded transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  const picks = [
    { icon: Sparkles, text: 'What are the key revenue trends across our ASEAN markets this quarter?', label: 'Revenue Trends' },
    { icon: Zap, text: 'Summarise the top 3 risk factors from the latest credit portfolio report', label: 'Risk Summary' },
    { icon: FileText, text: 'Generate a leadership briefing slide deck from the attached Q3 data', label: 'Briefing Deck' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0">
      <div className="w-10 h-10 rounded-lg bg-uob-blue/10 flex items-center justify-center mb-3 border border-uob-blue/20 shrink-0">
        <MessageSquare className="w-5 h-5 text-uob-blue" />
      </div>
      <h2 className="text-base font-semibold text-slate-900 mb-0.5 shrink-0">Welcome to PULSE MVP</h2>
      <p className="text-[12px] text-slate-500 mb-4 text-center max-w-sm shrink-0">
        AI assistant for UOB Leadership. Ask about revenue trends, risk summaries,
        or upload reports for instant insights.
      </p>
      <div className="w-full max-w-lg space-y-1.5 overflow-y-auto">
        {picks.map((p) => (
          <button
            key={p.text}
            onClick={() => onPick(p.text)}
            className="w-full flex items-start gap-2.5 px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-uob-blue/40 hover:bg-slate-50 transition-all text-left group shadow-sm"
          >
            <p.icon className="w-4 h-4 text-uob-blue shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-slate-700">{p.label}</div>
              <div className="text-[11px] text-slate-500 leading-snug">{p.text}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatInput({
  onSend,
  loading,
}: {
  onSend: (text: string, attachments?: Attachment[]) => void;
  loading?: boolean;
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim(), attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, attachments, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 180) + 'px';
    }
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === 'string' ? reader.result : '';
        setAttachments((prev) => [...prev, { name: file.name, content, type: file.type }]);
      };
      reader.readAsText(file);
    });
  }, []);

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-1.5">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {attachments.map((att) => (
            <AttachmentBadge key={att.name} att={att} onRemove={() => setAttachments((p) => p.filter((a) => a.name !== att.name))} />
          ))}
        </div>
      )}

      <div
        className={`flex items-end gap-2 bg-slate-50 border rounded-lg px-2.5 py-1.5 transition-colors ${
          dragOver ? 'border-uob-blue ring-1 ring-uob-blue/20' : 'border-slate-300 hover:border-slate-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors shrink-0"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.json,.js,.ts,.py,.html,.css" className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Message..."
          rows={1}
          className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder-slate-400 resize-none outline-none min-h-[22px] max-h-[180px] py-0.5"
          disabled={loading}
        />

        <button
          onClick={handleSend}
          disabled={loading || (!text.trim() && attachments.length === 0)}
          className="p-1.5 rounded-md transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed bg-uob-blue hover:bg-[#004c8c] text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <div className="text-[10px] text-slate-400 text-center mt-0.5">Shift+Enter for new line · Drag & drop files</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main App                                                           */
/* ------------------------------------------------------------------ */

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length]);

  const createConversation = useCallback(() => {
    const conv: Conversation = {
      id: uid(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const updateTitle = useCallback((id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  /* ---------------------------------------------------------------- */
  /*  PLACEHOLDER API CALL                                              */
  /* ---------------------------------------------------------------- */
  const callApi = useCallback(async (text: string, attachments?: Attachment[]) => {
    // ----------------------------------------------------------------
    // TODO: Replace with real API call.  Set VITE_CHAT_API_URL in .env
    // ----------------------------------------------------------------
    // const res = await fetch(API_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message: text, attachments }),
    // });
    // if (!res.ok) throw new Error(`API error ${res.status}`);
    // const data = await res.json();
    // return data.response as string;
    // ----------------------------------------------------------------

    // Demo fallback while API_URL is empty
    await new Promise((r) => setTimeout(r, 800));

    const lower = text.toLowerCase().trim();
    if (lower.includes('hello') || lower.includes('hi')) return "Hello! I'm PULSE, your UOB Leadership AI assistant. How can I help you today?";
    if (lower.includes('revenue') || lower.includes('asean')) {
      return "## ASEAN Revenue Trends — Q3 2024\n\n| Market | Revenue (S$M) | YoY Growth | Share |\n|--------|---------------|------------|-------|\n| Singapore | 1,240 | +4.2% | 38% |\n| Malaysia | 680 | +6.8% | 21% |\n| Thailand | 520 | +3.1% | 16% |\n| Indonesia | 410 | +8.4% | 13% |\n| Vietnam | 280 | +12.1% | 9% |\n| Others | 110 | +1.5% | 3% |\n\n**Key insight:** Vietnam leads growth at 12.1% YoY, driven by digital banking adoption and SME lending expansion.";
    }
    if (lower.includes('risk') || lower.includes('credit') || lower.includes('portfolio')) {
      return "## Top 3 Risk Factors — Credit Portfolio\n\n**1. Sector Concentration in Real Estate**\n- Exposure: S$4.2B (18% of portfolio)\n- Watch-list ratio ticked up 40bps to 2.1%\n\n**2. SME NPL Uptick**\n- Non-performing loans rose to 3.4% (+30bps QoQ)\n- Primarily hospitality and retail trade segments\n\n**3. FX Mismatch in Indonesia Subsidiary**\n- USD-denominated funding vs IDR lending\n- Hedging coverage at 72%; recommend raising to 85%\n\n> **Action:** Stress-test scenario with 200bps rate hike prepared for Board review.";
    }
    if (lower.includes('briefing') || lower.includes('slide') || lower.includes('deck')) {
      return "## Leadership Briefing — Q3 2024\n\n### Slide 1: Executive Summary\n- Net profit up 5.3% YoY to S$1.14B\n- CET1 ratio stable at 13.8%\n- Cost-to-income improved 70bps to 42.3%\n\n### Slide 2: Strategic Priorities\n1. **Digital acceleration** — 68% of new accounts via digital channels\n2. **Wealth management** — AUM crossed S$180B milestone\n3. **Sustainability** — Green loan book grew 24% to S$12B\n\n### Slide 3: Forward Outlook\n- Maintain NIM guidance 1.75–1.85%\n- Watch ASEAN rate divergence\n- Continue selective hiring in tech & WM\n\n*Full deck with charts available on SharePoint.*";
    }
    if (lower.includes('help')) {
      return "I can help UOB Leadership with:\n\n- **Revenue & market trends** across ASEAN\n- **Risk & credit portfolio** summaries\n- **Leadership briefings** and slide decks\n- **Data analysis** from uploaded reports\n- **Markdown formatting** for documents\n\nTry one of the suggested questions or upload a report.";
    }
    if (lower.includes('code') || lower.includes('function')) {
      return "```python\n# Sample data pipeline for portfolio analytics\nimport pandas as pd\n\ndef compute_npl_trend(portfolio_df: pd.DataFrame) -> pd.Series:\n    \"\"\"\n    Calculate NPL ratio trend by quarter.\n    portfolio_df: columns = ['quarter', 'npl_amount', 'total_loans']\n    \"\"\"\n    portfolio_df['npl_ratio'] = (\n        portfolio_df['npl_amount'] / portfolio_df['total_loans']\n    )\n    return portfolio_df.groupby('quarter')['npl_ratio'].mean()\n```";
    }
    if (lower.includes('markdown') || lower.includes('md')) {
      return "# Markdown Demo\n\n## Heading 2\n\n**Bold** and *italic* text\n\n- List item 1\n- List item 2\n\n> Blockquote\n\n| Col A | Col B |\n|-------|-------|\n| One   | Two   |";
    }
    if (lower.includes('symbol') || lower.includes('special')) {
      return "Special symbols:\n\n- Math: π ≈ 3.14159, ∑, ∫, √, ∞, ±\n- Currency: $, €, £, ¥, ₹\n- Arrows: →, ←, ↑, ↓, ↔, ⇒\n- Greek: α, β, γ, δ, ε, λ, μ, σ, ω\n- Emoji: ✓, ✗, ★, ☆, ♠, ♥, ♦, ♣";
    }
    if (lower.includes('file') || lower.includes('text') || lower.includes('document')) {
      return "I can render and analyze text files, markdown documents, and content with special symbols. Upload a file and I'll display it with proper formatting.";
    }
    return `You said: "${text}"\n\nI'm PULSE, the UOB Leadership AI assistant. Try asking about **revenue trends**, **risk summaries**, **briefing decks**, or upload a report for analysis.`;
  }, []);

  const handleSend = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      let convId = activeId;
      let conv = activeConv;

      if (!convId) {
        const newConv = createConversation();
        convId = newConv.id;
        conv = newConv;
      }
      if (!convId || !conv) return;

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: text,
        attachments,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() }
            : c
        )
      );

      if (conv.messages.length === 0) {
        updateTitle(convId, text.slice(0, 30) + (text.length > 30 ? '…' : ''));
      }

      setError(null);

      /* -------------------------------------------------------------- */
      /*  NON-BLOCKING: fire API in background, keep UI interactive      */
      /* -------------------------------------------------------------- */
      setLoading(true);

      (async () => {
        try {
          const responseText = await callApi(text, attachments);

          const assistantMsg: ChatMessage = {
            id: uid(),
            role: 'assistant',
            content: responseText,
            timestamp: Date.now(),
          };

          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() }
                : c
            )
          );
        } catch (err: any) {
          setError(err.message || 'Something went wrong');
        } finally {
          setLoading(false);
        }
      })();
    },
    [activeId, activeConv, createConversation, updateTitle, callApi]
  );

  const handleSuggestion = useCallback((text: string) => handleSend(text), [handleSend]);

  const handleLogout = useCallback(() => {
    if (confirm('Log out?')) {
      window.location.reload();
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white text-slate-800 overflow-hidden">
      {/* Header */}
      <header className="h-10 border-b border-slate-200 bg-white flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="sm:hidden p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
          >
            <Menu className="w-4 h-4" />
          </button>
          <MessageSquare className="w-4 h-4 text-uob-blue" />
          <span className="text-[13px] font-semibold text-slate-900 tracking-tight">PULSE MVP</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 rounded-md px-2 py-1 border border-slate-200">
            <div className="w-5 h-5 rounded-full bg-uob-blue/10 flex items-center justify-center">
              <User className="w-3 h-3 text-uob-blue" />
            </div>
            <span className="text-[11px] text-slate-600 hidden sm:inline">Leadership</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed left-0 top-10 bottom-0 w-56 bg-white border-r border-slate-200 z-50 sm:hidden flex flex-col">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200">
                <button
                  onClick={() => { createConversation(); setSidebarOpen(false); }}
                  className="flex items-center gap-2 flex-1 px-2 py-1 text-[13px] font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded transition-colors border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New chat
                </button>
                <button onClick={() => setSidebarOpen(false)} className="p-1 ml-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-2 mx-1 px-2 py-1 rounded cursor-pointer transition-colors ${
                      activeId === c.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                    onClick={() => { setActiveId(c.id); setSidebarOpen(false); }}
                  >
                    <MessageSquare className="w-3 h-3 shrink-0 opacity-50" />
                    <span className="text-[12px] truncate flex-1">{c.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Desktop sidebar */}
        <div className="hidden sm:flex">
          <Sidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={setActiveId}
            onNew={createConversation}
            onDelete={deleteConversation}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((p) => !p)}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {activeConv ? (
            <>
              <div className="flex-1 overflow-y-auto">
                {activeConv.messages.length === 0 && <EmptyState onPick={handleSuggestion} />}
                {activeConv.messages.map((msg) => (
                  <ChatBubble key={msg.id} msg={msg} />
                ))}
                {loading && (
                  <div className="flex gap-2.5 px-3 py-2 bg-white">
                    <div className="w-5 h-5 rounded-full bg-uob-blue/10 flex items-center justify-center border border-uob-blue/20 shrink-0">
                      <div className="w-1.5 h-1.5 bg-uob-blue rounded-full animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                      <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="px-3 py-1.5 bg-red-50 border-t border-red-100 text-[11px] text-red-600">
                    Error: {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <ChatInput onSend={handleSend} loading={loading} />
            </>
          ) : (
            <>
              <EmptyState onPick={handleSuggestion} />
              <ChatInput onSend={handleSend} loading={loading} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
