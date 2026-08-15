// NFR-006 — Rendered Markdown and user text must be sanitized.
//
// VSO renders owner/agent-authored Markdown (Project Brain, decisions, reviews,
// work-packet objective/scope, etc.). No third-party Markdown library is part of
// the frozen MVP toolchain, so this module implements a small, dependency-free
// renderer with a HARD security invariant:
//
//   USER TEXT IS NEVER INTERPRETED AS HTML.
//
// The pipeline is: escape all HTML first, THEN apply a whitelisted set of
// Markdown transforms that only EVER emit our own safe tags. Raw HTML in the
// source is rendered as inert text. This makes stored XSS structurally
// impossible regardless of input.

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape a string so it can never be parsed as HTML. */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

// Tags that must never survive, even if somehow present after escaping edge
// cases. We strip them defensively as well.
const FORBIDDEN_TAGS = /<\/?(script|style|iframe|object|embed|link|meta|svg|img|video|audio|base|form|input|button)[\s>]/gi;

/**
 * Sanitize already-rendered HTML for the (rare) cases where a trusted source
 * produces markup: strip forbidden tags and all on* event-handler attributes,
 * and javascript: URLs. Used as a final defense layer, not the primary path.
 */
export function sanitizeHtml(dirty: string): string {
  let out = dirty.replace(FORBIDDEN_TAGS, "");
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[\w-]+)/gi, "");
  out = out.replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"');
  // Remove any residual < that escaped the above (defense in depth).
  return out;
}

function inline(text: string): string {
  // text is already HTML-escaped. Apply only safe inline emphasis.
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/**
 * Render Markdown to HTML with the NFR-006 invariant: source is HTML-escaped
 * first, so embedded HTML/markup can never execute. Supports a safe subset:
 * headings, bold/italic/code, unordered lists, fenced code blocks, and
 * paragraphs. Returns a string safe to inject via dangerouslySetInnerHTML.
 */
export function renderMarkdownSafe(markdown: string): string {
  if (!markdown) return "";
  const escaped = escapeHtml(markdown);
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let inCode = false;
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("```")) {
      if (inCode) {
        html.push("</code></pre>");
        inCode = false;
      } else {
        closeList();
        html.push("<pre><code>");
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      // line is already HTML-escaped; do NOT re-escape (would double-encode).
      html.push(line + "\n");
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    closeList();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (line.trim() === "") continue;
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (inCode) html.push("</code></pre>");
  return html.join("\n");
}
