import { Component, computed, input } from '@angular/core';

/** A run of plain text, or a run that is a link. */
export interface TextSegment {
  readonly text: string;
  /** Absolute URL when the segment is a link, `null` for plain prose. */
  readonly href: string | null;
}

/**
 * Bare URLs as brands actually type them: `https://…`, `http://…` and the
 * protocol-less `www.…`. Deliberately conservative — a token has to look like a
 * URL, not merely contain a dot, so `*714*22#` and `E-WALE.` stay prose.
 */
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/**
 * Sentence punctuation that follows a URL far more often than it belongs to it.
 * A closing bracket is only trimmed when the URL carries no matching opener, so
 * Wikipedia-style `…_(disambiguation)` links survive.
 */
function trimTrailingPunctuation(url: string): string {
  let end = url.length;
  while (end > 0) {
    const char = url[end - 1];
    if (char === ')' || char === ']') {
      const opener = char === ')' ? '(' : '[';
      const opened = url.slice(0, end).split(opener).length - 1;
      const closed = url.slice(0, end).split(char).length - 1;
      if (opened >= closed) {
        break;
      }
    } else if (!'.,;:!?"\''.includes(char)) {
      break;
    }
    end -= 1;
  }
  return url.slice(0, end);
}

/**
 * Splits user-authored copy into plain runs and link runs. Text is never
 * altered — the segments always concatenate back to the input — so the caller
 * can bind them with interpolation and keep Angular's escaping.
 */
export function splitLinks(value: string | null | undefined): TextSegment[] {
  const text = value ?? '';
  if (!text) {
    return [];
  }

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const url = trimTrailingPunctuation(raw);
    if (!url) {
      continue;
    }
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), href: null });
    }
    segments.push({
      text: url,
      href: url.toLowerCase().startsWith('www.') ? `https://${url}` : url,
    });
    cursor = start + url.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), href: null });
  }

  return segments;
}

/**
 * Renders a block of user-authored copy with its bare URLs turned into real
 * links. Brands paste WhatsApp invites and Drive links straight into campaign
 * requirement notes, where a plain-text URL is both unclickable and — being one
 * unbreakable 50-character token — wide enough to push a phone's layout past
 * its viewport. `overflow-wrap: anywhere` (via `co-user-text`) handles the
 * width; the anchors handle the tap.
 */
@Component({
  selector: 'app-linkified-text',
  template: `<span class="co-user-text whitespace-pre-line">
    @for (segment of segments(); track $index) {
      @if (segment.href) {
        <a
          [href]="segment.href"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[#EC612C] underline underline-offset-2"
          >{{ segment.text }}</a
        >
      } @else {
        {{ segment.text }}
      }
    }
  </span>`,
})
export class LinkifiedText {
  readonly value = input.required<string | null | undefined>();

  protected readonly segments = computed(() => splitLinks(this.value()));
}
