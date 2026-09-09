import { Component, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';

/**
 * `pill` is the light bordered button on the public campaign page, `dark` its
 * black counterpart on the signed-in studio card (Figma 397:3135 "Frame 6"),
 * `text` the compact control on an admin card, `icon` drops the label,
 * `secondary` matches the grey admin header actions, and `block` is a
 * full-width row for the wizard's success screen.
 */
export type ShareVariant = 'pill' | 'dark' | 'text' | 'icon' | 'secondary' | 'block';

const VARIANT_CLASSES: Record<ShareVariant, string> = {
  pill: 'gap-2.5 rounded-full border border-[#D7D7D7] bg-white px-3 py-1 text-[16px] leading-6 text-[#212121] hover:bg-[#F6F6F6]',
  dark: 'gap-2.5 rounded-full bg-black px-2 py-0.5 text-[16px] leading-[23.8px] text-white [font-family:var(--clapout-font-heading)] hover:bg-[#242424] lg:px-3.5 lg:py-1',
  text: 'gap-1.5 rounded-full border border-[#DDDDDD] bg-white px-2.5 py-1 text-[13.13px] leading-[17.07px] font-medium text-[#525252] hover:bg-[#F1F1F1]',
  icon: 'h-9 w-9 justify-center rounded-full border border-[#D7D7D7] bg-white text-[#212121] hover:bg-[#F6F6F6]',
  secondary:
    'gap-2 rounded-lg border border-[#ECECEC] bg-[#ECECEC] px-4 py-2.5 text-sm text-[#525252] hover:bg-[#E2E2E2]',
  block:
    'h-[52px] w-full justify-center gap-2.5 rounded-xl border border-[#B4B4B4] bg-white text-[20px] text-[#151515] hover:bg-[#F6F6F6]',
};

/** The public page a campaign is shared to, e.g. `https://host/campaigns/e-wale`. */
export function campaignShareUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, '')}/campaigns/${slug}`;
}

export function campaignShareUrlWithSuffix(origin: string, slug: string, suffix = ''): string {
  return `${campaignShareUrl(origin, slug)}${suffix}`;
}

/**
 * Shares a campaign's public page.
 *
 * On a phone this hands off to the OS share sheet, which is what people
 * actually want when they are about to paste a campaign into WhatsApp. On a
 * desktop browser — where `navigator.share` is usually absent — it copies the
 * link and says so through the app toast. A locked-down clipboard (insecure
 * origin, denied permission) falls back to a dialog showing the URL so the
 * link is never unreachable.
 */
@Component({
  imports: [DialogModule],
  selector: 'app-share-campaign-button',
  template: `
    <button
      type="button"
      class="inline-flex cursor-pointer items-center whitespace-nowrap transition-colors max-sm:min-h-10"
      [class]="buttonClass()"
      [attr.aria-label]="ariaLabel()"
      (click)="share($event)"
    >
      <!-- The classic curly share arrow: a forward chevron looping back under itself. -->
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0"
        [class]="iconClass()"
        aria-hidden="true"
      >
        <path d="M14 5l7 7-7 7M21 12H9a6 6 0 0 0-6 6v1" />
      </svg>
      @if (variant() !== 'icon') {
        <span aria-hidden="true">{{ label() }}</span>
      }
    </button>

    <p-dialog
      [header]="dialogTitle()"
      styleClass="!w-[min(92vw,28rem)]"
      [modal]="true"
      [draggable]="false"
      [visible]="fallbackOpen()"
      (visibleChange)="fallbackOpen.set($event)"
    >
      <p class="m-0 text-sm text-surface-600">{{ dialogDescription() }}</p>
      <input
        class="co-user-text mt-3 w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-800"
        readonly
        [value]="shareUrl()"
        aria-label="Campaign link"
        (focus)="selectAll($event)"
      />
    </p-dialog>
  `,
})
export class ShareCampaignButton {
  readonly slug = input.required<string>();
  readonly title = input<string>('');
  readonly brandName = input<string>('');
  readonly variant = input<ShareVariant>('pill');
  /** `block` reads better as a sentence than a bare "Share". */
  readonly label = input<string>('Share');
  readonly ariaLabel = input<string>('Share campaign');
  readonly dialogTitle = input<string>('Share campaign');
  readonly dialogDescription = input<string>('Copy this link to share the campaign.');
  readonly urlSuffix = input<string>('');

  private readonly document = inject(DOCUMENT);
  private readonly messages = inject(MessageService);

  protected readonly fallbackOpen = signal(false);
  protected readonly buttonClass = computed(() => VARIANT_CLASSES[this.variant()]);
  /** The studio pill draws an 18px arrow; every other placement keeps 16px. */
  protected readonly iconClass = computed(() =>
    this.variant() === 'dark' ? 'h-[18px] w-[18px]' : 'h-4 w-4',
  );

  protected readonly shareUrl = computed(() =>
    campaignShareUrlWithSuffix(
      this.document.defaultView?.location.origin ?? '',
      this.slug(),
      this.urlSuffix(),
    ),
  );

  /** The card placements sit inside a link, so the click must not navigate. */
  protected async share(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const url = this.shareUrl();
    const nav = this.document.defaultView?.navigator;

    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({
          title: this.title() || this.brandName(),
          text: [this.brandName(), this.title()].filter(Boolean).join(' — '),
          url,
        });
        return;
      } catch (error) {
        // Dismissing the share sheet is a normal outcome, not a failure to fall back from.
        if ((error as { name?: string } | null)?.name === 'AbortError') {
          return;
        }
      }
    }

    const clipboard = nav?.clipboard;
    if (clipboard && typeof clipboard.writeText === 'function') {
      try {
        await clipboard.writeText(url);
        this.messages.add({
          severity: 'success',
          summary: 'Link copied',
          detail: url,
          life: 4000,
        });
        return;
      } catch {
        // An insecure origin or a denied permission — show the link instead.
      }
    }

    this.fallbackOpen.set(true);
  }

  protected selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }
}
