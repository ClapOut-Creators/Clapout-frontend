import { Component, input, model } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CampaignPlatform } from '../../core/models/campaign';

/**
 * The brand glyph the clipper boards draw: a 23px app-icon tile in the platform
 * row under a sheet's subtitle, and the same mark in one flat colour inside a
 * link field (`variant="mark"`, which inherits `currentColor`).
 *
 * It is inline SVG rather than `@primeicons/angular` because those glyphs are
 * monochrome and the boards show the real, coloured marks; it is a template
 * (not an `[innerHTML]` string) because Angular's HTML sanitiser strips `<svg>`.
 * That is also why the Snapchat ghost is repeated here rather than taken from
 * `app-snapchat-icon`: that component paints one flat `currentColor` at a px
 * size, and these marks are two-tone and sized by their box.
 *
 * It lives in this file rather than in one of its own so the overlay shell and
 * both dialogs built on it share a single import.
 */
@Component({
  selector: 'app-platform-glyph',
  host: { class: 'block' },
  template: `
    @if (variant() === 'tile') {
      @switch (platform()) {
        @case ('tiktok') {
          <svg viewBox="0 0 23 23" class="block size-full" aria-hidden="true">
            <rect width="23" height="23" rx="6.4" fill="#010101" />
            <path
              transform="translate(4.6 4.3) scale(0.6)"
              d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z"
              fill="#FFFFFF"
            />
          </svg>
        }
        @case ('instagram') {
          <svg viewBox="0 0 23 23" class="block size-full" aria-hidden="true">
            <defs>
              <linearGradient id="co-ig-tile" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stop-color="#FEDA75" />
                <stop offset="0.28" stop-color="#FA7E1E" />
                <stop offset="0.58" stop-color="#D62976" />
                <stop offset="0.8" stop-color="#962FBF" />
                <stop offset="1" stop-color="#4F5BD5" />
              </linearGradient>
            </defs>
            <rect width="23" height="23" rx="6.4" fill="url(#co-ig-tile)" />
            <rect
              x="5"
              y="5"
              width="13"
              height="13"
              rx="4.2"
              fill="none"
              stroke="#FFFFFF"
              stroke-width="1.5"
            />
            <circle cx="11.5" cy="11.5" r="3.1" fill="none" stroke="#FFFFFF" stroke-width="1.5" />
            <circle cx="15.5" cy="7.6" r="1" fill="#FFFFFF" />
          </svg>
        }
        @case ('youtube') {
          <svg viewBox="0 0 23 23" class="block size-full" aria-hidden="true">
            <rect width="23" height="23" rx="6.4" fill="#FF0000" />
            <path
              d="M18.1 8.9a1.8 1.8 0 0 0-1.26-1.27C15.72 7.33 11.5 7.33 11.5 7.33s-4.22 0-5.34.3A1.8 1.8 0 0 0 4.9 8.9c-.3 1.11-.3 3.44-.3 3.44s0 2.33.3 3.44c.16.61.65 1.1 1.26 1.26 1.12.3 5.34.3 5.34.3s4.22 0 5.34-.3a1.8 1.8 0 0 0 1.26-1.26c.3-1.11.3-3.44.3-3.44s0-2.33-.3-3.44Z"
              fill="#FFFFFF"
            />
            <path d="M10.2 14.2V10.5l3.2 1.85-3.2 1.85Z" fill="#FF0000" />
          </svg>
        }
        @case ('facebook') {
          <svg viewBox="0 0 23 23" class="block size-full" aria-hidden="true">
            <rect width="23" height="23" rx="6.4" fill="#1877F2" />
            <path
              d="M14.7 12.6l.35-2.3h-2.2V8.8c0-.63.31-1.24 1.3-1.24h1V5.6s-.91-.16-1.78-.16c-1.81 0-3 1.1-3 3.09v1.77H8.35v2.3h2.02v5.56h2.48V12.6h1.85Z"
              fill="#FFFFFF"
            />
          </svg>
        }
        @case ('snapchat') {
          <svg viewBox="0 0 23 23" class="block size-full" aria-hidden="true">
            <rect width="23" height="23" rx="6.4" fill="#FFFC00" />
            <path
              transform="translate(3.46 3.46) scale(0.67)"
              d="M3 18.7V12.2a9 9 0 0 1 18 0v6.5q-3 4.2-6 0-3 4.2-6 0-3 4.2-6 0Z"
              fill="#010101"
            />
          </svg>
        }
        @case ('whatsapp') {
          <svg viewBox="0 0 23 23" class="block size-full" aria-hidden="true">
            <rect width="23" height="23" rx="6.4" fill="#25D366" />
            <path
              transform="translate(4.3 4.3) scale(0.72)"
              d="M15.604 4.325C14.108 2.825 12.115 2 9.99699 2C5.62599 2 2.068 5.557 2.068 9.929C2.068 11.325 2.432 12.69 3.125 13.893L2 18L6.20399 16.896C7.36099 17.528 8.665 17.86 9.993 17.86H9.99699C14.365 17.86 18.001 14.303 18.001 9.931C18 7.814 17.1 5.825 15.604 4.325ZM9.99699 16.525C8.81099 16.525 7.651 16.207 6.64 15.607L6.401 15.464L3.908 16.118L4.572 13.686L4.415 13.436C3.754 12.386 3.408 11.175 3.408 9.929C3.408 6.297 6.365 3.34 10.001 3.34C11.762 3.34 13.415 4.026 14.658 5.272C15.901 6.518 16.665 8.172 16.662 9.933C16.661 13.568 13.629 16.525 9.99699 16.525ZM13.611 11.589C13.415 11.489 12.44 11.01 12.257 10.946C12.075 10.878 11.943 10.846 11.811 11.046C11.679 11.246 11.3 11.689 11.182 11.825C11.068 11.957 10.95 11.975 10.753 11.875C9.589 11.293 8.824 10.836 8.057 9.51801C7.853 9.16801 8.261 9.193 8.639 8.436C8.703 8.304 8.67099 8.19 8.62099 8.09C8.57099 7.99 8.17499 7.015 8.00999 6.619C7.84899 6.233 7.685 6.287 7.564 6.28C7.45 6.273 7.318 6.27299 7.185 6.27299C7.052 6.27299 6.839 6.323 6.656 6.519C6.474 6.719 5.963 7.198 5.963 8.173C5.963 9.148 6.674 10.091 6.77 10.223C6.87 10.355 8.166 12.355 10.156 13.216C11.413 13.759 11.906 13.805 12.535 13.712C12.917 13.655 13.706 13.233 13.871 12.769C14.035 12.305 14.035 11.908 13.985 11.826C13.94 11.735 13.807 11.685 13.611 11.589Z"
              fill="#FFFFFF"
            />
          </svg>
        }
        @default {
          <svg viewBox="0 0 23 23" class="block size-full" aria-hidden="true">
            <rect width="23" height="23" rx="6.4" fill="#010101" />
            <path
              d="M13.1 10.6 16.6 6.4h-1.4l-2.8 3.3-2.2-3.3H6.4l3.7 5.3-3.7 4.4h1.4l3.1-3.7 2.5 3.7h3.8l-4.1-5.5Zm-1.1 1.3-.4-.5-2.8-4h1.3l2.3 3.3.4.5 3 4.3h-1.3l-2.5-3.6Z"
              fill="#FFFFFF"
            />
          </svg>
        }
      }
    } @else {
      @switch (platform()) {
        @case ('tiktok') {
          <svg viewBox="0 0 24 24" class="block size-full" fill="currentColor" aria-hidden="true">
            <path
              d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z"
            />
          </svg>
        }
        @case ('instagram') {
          <svg
            viewBox="0 0 24 24"
            class="block size-full"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
          </svg>
        }
        @case ('youtube') {
          <svg viewBox="0 0 24 24" class="block size-full" fill="currentColor" aria-hidden="true">
            <path
              d="M22.5 7.3a2.6 2.6 0 0 0-1.83-1.84C19.05 5 12 5 12 5s-7.05 0-8.67.46A2.6 2.6 0 0 0 1.5 7.3C1.05 8.93 1.05 12 1.05 12s0 3.07.45 4.7c.25.9.94 1.6 1.83 1.84C4.95 19 12 19 12 19s7.05 0 8.67-.46a2.6 2.6 0 0 0 1.83-1.84c.45-1.63.45-4.7.45-4.7s0-3.07-.45-4.7ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"
            />
          </svg>
        }
        @case ('facebook') {
          <svg viewBox="0 0 24 24" class="block size-full" fill="currentColor" aria-hidden="true">
            <path
              d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"
            />
          </svg>
        }
        @case ('x') {
          <svg viewBox="0 0 24 24" class="block size-full" fill="currentColor" aria-hidden="true">
            <path
              d="M13.9 10.6 21 2.5h-1.7l-6.16 7.05L8.22 2.5H2.5l7.44 10.82L2.5 21.5h1.7l6.5-7.45 5.2 7.45h5.72L13.9 10.6Zm-2.3 2.64-.76-1.08L4.8 3.8h2.6l4.83 6.9.75 1.08 6.28 8.98h-2.6l-5.07-7.25Z"
            />
          </svg>
        }
        @case ('snapchat') {
          <svg viewBox="0 0 24 24" class="block size-full" fill="currentColor" aria-hidden="true">
            <path d="M3 18.7V12.2a9 9 0 0 1 18 0v6.5q-3 4.2-6 0-3 4.2-6 0-3 4.2-6 0Z" />
          </svg>
        }
        @case ('whatsapp') {
          <!-- The PrimeIcons mark, whose own box is 20 rather than 24. -->
          <svg viewBox="0 0 20 20" class="block size-full" fill="currentColor" aria-hidden="true">
            <path
              d="M15.604 4.325C14.108 2.825 12.115 2 9.99699 2C5.62599 2 2.068 5.557 2.068 9.929C2.068 11.325 2.432 12.69 3.125 13.893L2 18L6.20399 16.896C7.36099 17.528 8.665 17.86 9.993 17.86H9.99699C14.365 17.86 18.001 14.303 18.001 9.931C18 7.814 17.1 5.825 15.604 4.325ZM9.99699 16.525C8.81099 16.525 7.651 16.207 6.64 15.607L6.401 15.464L3.908 16.118L4.572 13.686L4.415 13.436C3.754 12.386 3.408 11.175 3.408 9.929C3.408 6.297 6.365 3.34 10.001 3.34C11.762 3.34 13.415 4.026 14.658 5.272C15.901 6.518 16.665 8.172 16.662 9.933C16.661 13.568 13.629 16.525 9.99699 16.525ZM13.611 11.589C13.415 11.489 12.44 11.01 12.257 10.946C12.075 10.878 11.943 10.846 11.811 11.046C11.679 11.246 11.3 11.689 11.182 11.825C11.068 11.957 10.95 11.975 10.753 11.875C9.589 11.293 8.824 10.836 8.057 9.51801C7.853 9.16801 8.261 9.193 8.639 8.436C8.703 8.304 8.67099 8.19 8.62099 8.09C8.57099 7.99 8.17499 7.015 8.00999 6.619C7.84899 6.233 7.685 6.287 7.564 6.28C7.45 6.273 7.318 6.27299 7.185 6.27299C7.052 6.27299 6.839 6.323 6.656 6.519C6.474 6.719 5.963 7.198 5.963 8.173C5.963 9.148 6.674 10.091 6.77 10.223C6.87 10.355 8.166 12.355 10.156 13.216C11.413 13.759 11.906 13.805 12.535 13.712C12.917 13.655 13.706 13.233 13.871 12.769C14.035 12.305 14.035 11.908 13.985 11.826C13.94 11.735 13.807 11.685 13.611 11.589Z"
            />
          </svg>
        }
        @default {
          <!-- Anything we cannot place: the generic chain link. -->
          <svg
            viewBox="0 0 24 24"
            class="block size-full"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M10.1 13.9a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 1 0-5.66-5.66l-1.1 1.1" />
            <path d="M13.9 10.1a4 4 0 0 0-5.66 0L5.4 12.93a4 4 0 1 0 5.66 5.66l1.1-1.1" />
          </svg>
        }
      }
    }
  `,
})
export class PlatformGlyph {
  /** null draws the generic link glyph — a profile on none of the five. */
  readonly platform = input<CampaignPlatform | null>(null);
  /** 'tile' = the coloured app icon; 'mark' = the flat `currentColor` mark. */
  readonly variant = input<'tile' | 'mark'>('tile');
}

/** Poppins 24/36 on a phone, 40/60 on the desktop board; `rgba(0,0,0,0.8)`. */
export const SHEET_TITLE_CLASS =
  'm-0 text-center text-[24px] leading-[36px] font-semibold text-black/80 [font-family:var(--clapout-font-heading)] lg:text-[40px] lg:leading-[60px]';

/** 16/19 on a phone, 22/26 on the desktop board, `#464646`, centred. */
export const SHEET_SUBTITLE_CLASS =
  'm-0 text-center text-[16px] leading-[19px] text-[#464646] lg:text-[22px] lg:leading-[26px]';

/*
 * The rest of the sheet's vocabulary, shared by the submit-post and add-social
 * overlays so the two boards stay one design. Class strings rather than
 * components: the repo styles PrimeNG and plain controls with Tailwind
 * arbitrary values throughout, and these are literally the boards' pixel
 * values at the 1728 basis (`lg:`) with the 402 board underneath.
 */

/** "Post Link", "Social Link", "Network" — 20/24 medium, `#0C0C0C`. */
export const SHEET_LABEL_CLASS = 'text-[20px] leading-[24px] font-medium text-[#0C0C0C]';

/** The red asterisk beside a required label, on the label's own 24px line. */
export const SHEET_REQUIRED_CLASS = 'text-[20px] leading-[24px] text-[#D00000] lg:text-[22px]';

/** The 50px white field: 1px `#D7D7D7`, 12px radius, 18/20px text. */
export const SHEET_FIELD_CLASS =
  'h-[50px] w-full rounded-[12px] border border-[#D7D7D7] bg-white px-[17px] text-[18px] text-[#262626] placeholder:text-[#808080] lg:px-[18px] lg:text-[20px] lg:placeholder:text-[#B6B6B6]';

/** Left padding that clears the platform glyph drawn inside a link field. */
export const SHEET_FIELD_WITH_GLYPH_CLASS = 'pl-[44px] lg:pl-[46px]';

/** The near-black gradient primary: "Continue →", "Save social". */
export const SHEET_PRIMARY_BUTTON_CLASS =
  'inline-flex h-[40px] cursor-pointer items-center justify-center gap-[10px] rounded-[12px] border-0 bg-[linear-gradient(180deg,#3F3F3F_0%,#0A0A0A_100%)] px-[27.74px] text-[16px] leading-[23.8px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 lg:h-[50px] lg:text-[18px]';

/** The white outlined companion: "Back", "Change". */
export const SHEET_SECONDARY_BUTTON_CLASS =
  'inline-flex h-[40px] cursor-pointer items-center justify-center gap-[10px] rounded-[12px] border border-[#D7D7D7] bg-white px-[27.74px] text-[16px] leading-[23.8px] font-medium text-[#2D2D2D] disabled:cursor-not-allowed disabled:opacity-60 lg:h-[50px] lg:border-[#CBCBCB] lg:text-[18px] lg:text-[#464646]';

/** The orange chip: "Upload image", "Add link". */
export const SHEET_CHIP_BUTTON_CLASS =
  'inline-flex h-[36px] cursor-pointer items-center justify-center rounded-[10px] border-0 bg-[#EC612C] px-[14px] text-[18px] leading-[23.8px] font-medium text-white hover:bg-[#D9541F]';

/** The hairline the boards draw above the terms line. */
export const SHEET_RULE_CLASS = 'h-px w-full bg-[#EDEDED]';

/** "By adding, you agree to our …" — 14px on a phone, 18px on the board. */
export const SHEET_TERMS_CLASS =
  'm-0 text-center text-[14px] leading-[19px] text-[#898989] lg:text-[18px] lg:leading-[21px]';

/** The underlined legal links inside {@link SHEET_TERMS_CLASS}. */
export const SHEET_TERMS_LINK_CLASS = 'font-semibold text-[#1E1E1E] underline underline-offset-2';

/** Inline validation and API failures, red on the step that caused them. */
export const SHEET_ERROR_CLASS = 'm-0 text-[14px] leading-[19px] text-[#D00000] lg:text-[16px]';

/**
 * The full-screen overlay the clipper boards draw for "Submit post link"
 * (Figma 398:5569 → 398:6048) and "Add your social account" (397:1535 /
 * 378:640): the campaign page shows through a heavy blur, a grey circular ×
 * sits in the viewport's top-right corner, and a 506px column is centred over
 * it with a Poppins title, a subtitle, an optional row of platform glyphs and
 * whatever the caller projects.
 *
 * Why `p-dialog` rather than a hand-rolled `position: fixed` div: it already
 * owns the modal behaviour this has to get right — a focus trap that keeps Tab
 * inside the sheet, `aria-modal` + `role="dialog"` on the right element, the
 * body scroll block, and the z-index stack shared with the toast and the
 * confirm dialog. Only the chrome is replaced, through `styleClass` /
 * `maskStyleClass` / `contentStyleClass` (see the "Clipper overlay sheet" block
 * at the end of `src/styles.css`); nothing else about the dialog is overridden.
 *
 * Escape and mask clicks are handled here rather than through PrimeNG's
 * `closeOnEscape` / `dismissableMask`, because both of those close the dialog
 * from inside PrimeNG before {@link closeGuard} could ask "Discard this
 * submission?". The guard is the point of the component, so both gestures route
 * through {@link requestClose} instead.
 */
@Component({
  imports: [DialogModule, PlatformGlyph],
  selector: 'app-overlay-sheet',
  // Both dismiss gestures are caught on the document rather than in the
  // template. Escape, because after the discard confirmation closes focus can
  // land back on <body>, where a listener bound inside the sheet would never
  // see the next key (PrimeNG overlays that handle Escape themselves, such as a
  // select panel, stop it before it reaches here). The backdrop, because the
  // element behind the column is a mask, not a control — giving it a click
  // handler in the template would (rightly) ask for a keyboard handler and a
  // tab stop on a full-page div. `mousedown` is the gesture PrimeNG's own
  // `dismissableMask` uses.
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
    '(document:mousedown)': 'onDocumentMouseDown($event)',
  },
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onDialogVisibleChange($event)"
      (onShow)="onShown()"
      [modal]="true"
      [showHeader]="false"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="false"
      [dismissableMask]="false"
      [blockScroll]="true"
      appendTo="body"
      styleClass="co-sheet"
      maskStyleClass="co-sheet-mask"
      contentStyleClass="co-sheet-content"
    >
      <!-- First in the DOM on purpose: p-dialog focuses the first focusable
           element it finds on show, and the close button is a kinder landing
           place than a required field that would flag itself the moment focus
           moved on. It is position:fixed, so it still paints top-right. -->
      <button type="button" class="co-sheet-close" aria-label="Close" (click)="requestClose()">
        <svg
          viewBox="0 0 12 12"
          class="relative block size-[11px] lg:size-[12px]"
          fill="none"
          stroke="#393939"
          stroke-width="2.2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M1.4 1.4 10.6 10.6M10.6 1.4 1.4 10.6" />
        </svg>
      </button>

      <!-- The backdrop hit area: a mousedown that lands on this element rather
           than on the column inside it is a click beside the sheet. -->
      <div class="co-sheet-root">
        <div class="mx-auto w-full max-w-[506px]">
          <header class="flex flex-col items-center gap-[6px] lg:gap-[8px]">
            <ng-content select="[sheetBadge]" />
            <h2 id="co-sheet-title" [class]="titleClass">{{ title() }}</h2>
            @if (subtitle(); as text) {
              <p [class]="subtitleClass">{{ text }}</p>
            }
            <!-- Boards whose subtitle carries a bold word project their own
                 paragraph here, styled with SHEET_SUBTITLE_CLASS. -->
            <ng-content select="[sheetSubtitle]" />
            @if (platforms().length > 0) {
              <div class="flex items-center gap-[11.9px]">
                @for (platform of platforms(); track platform) {
                  <app-platform-glyph class="size-[23px]" [platform]="platform" />
                }
              </div>
            }
          </header>

          <div class="mt-[38px] lg:mt-[42px]">
            <ng-content />
          </div>
        </div>
      </div>
    </p-dialog>
  `,
})
export class OverlaySheet {
  /** Two-way: the host opens it, the × / Escape / backdrop close it. */
  readonly visible = model(false);
  /** Poppins 40px (24px on a phone) heading; also the sheet's accessible name. */
  readonly title = input('');
  /** Plain-text subtitle. Boards needing a bold word project `[sheetSubtitle]`. */
  readonly subtitle = input('');
  /** Brand tiles under the subtitle, exactly as the boards draw them. */
  readonly platforms = input<readonly CampaignPlatform[]>([]);
  /**
   * Asked before the × / Escape / backdrop close the sheet. Resolving false
   * keeps it open — used for "Discard this submission?".
   */
  readonly closeGuard = input<(() => boolean | Promise<boolean>) | null>(null);

  protected readonly titleClass = SHEET_TITLE_CLASS;
  protected readonly subtitleClass = SHEET_SUBTITLE_CLASS;

  private guardRunning = false;

  /**
   * `p-dialog` wires `aria-labelledby` to its own header bar, which this sheet
   * replaces; point the name at the projected title instead. Only one modal
   * sheet is open at a time, so the document query is unambiguous.
   */
  protected onShown(): void {
    document.querySelector('.p-dialog.co-sheet')?.setAttribute('aria-labelledby', 'co-sheet-title');
  }

  protected onEscapeKey(): void {
    if (this.visible()) {
      void this.requestClose();
    }
  }

  /** PrimeNG only ever asks to close (Escape and the mask are disabled above). */
  protected onDialogVisibleChange(open: boolean): void {
    if (!open) {
      void this.requestClose();
    }
  }

  protected onDocumentMouseDown(event: MouseEvent): void {
    const target = event.target;
    if (
      this.visible() &&
      target instanceof HTMLElement &&
      target.classList.contains('co-sheet-root')
    ) {
      void this.requestClose();
    }
  }

  /** Runs {@link closeGuard} (once at a time) and closes when it agrees. */
  async requestClose(): Promise<void> {
    if (this.guardRunning) {
      return;
    }
    const guard = this.closeGuard();
    if (!guard) {
      this.visible.set(false);
      return;
    }
    this.guardRunning = true;
    try {
      if (await guard()) {
        this.visible.set(false);
      }
    } finally {
      this.guardRunning = false;
    }
  }
}
