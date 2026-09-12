import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { OnboardingStepper } from '../../shared/creator/onboarding-stepper';

/**
 * `/creator/onboarding` — where sign-up lands and where {@link onboardingGuard}
 * sends a creator who tries to apply before finishing setup. The steps are
 * email verification (until the emailed link is opened), socials and the
 * WhatsApp community. The page is only
 * the stepper, centred, with no navigation chrome: the point is that there is
 * nothing else to do here until the steps are done.
 *
 * `?returnUrl=` carries the page that was asked for (a campaign's apply form,
 * usually) and is honoured by the final button; without one, "Browse
 * campaigns" means exactly that. A creator who has already finished is sent
 * straight on, so the URL cannot be used to repeat the steps.
 */
@Component({
  imports: [OnboardingStepper],
  selector: 'app-creator-onboarding',
  template: `
    <main class="flex min-h-[calc(100vh-88px)] items-center justify-center px-4 py-10">
      <section
        class="w-full max-w-[560px] rounded-[24px] border border-[#EDEDED] bg-white px-6 py-8 shadow-[0_18px_60px_rgba(0,0,0,0.06)] lg:px-10 lg:py-10"
        aria-labelledby="onboarding-title"
      >
        <h1
          id="onboarding-title"
          class="m-0 mb-[6px] text-center text-[26px] leading-[34px] font-semibold text-black/80 [font-family:var(--clapout-font-heading)] lg:text-[32px] lg:leading-[42px]"
        >
          Finish setting up
        </h1>
        <p
          class="m-0 mb-[28px] text-center text-[15px] leading-[22px] text-[#6B6B6B] lg:text-[16px]"
        >
          A few quick steps and you are ready to clip.
        </p>
        <app-onboarding-stepper (finished)="finish()" />
      </section>
    </main>
  `,
})
export class CreatorOnboarding {
  /** Bound from `?returnUrl=` via `withComponentInputBinding()`. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    void this.skipIfDone();
  }

  /**
   * Already onboarded (a bookmark, or the back button after finishing): nothing
   * to do here. Checked once on arrival rather than in an `effect`, because the
   * flag flips mid-flow when the community step is confirmed and the "all set"
   * step must still get its moment.
   */
  private async skipIfDone(): Promise<void> {
    await this.auth.whenSessionReady();
    if (this.auth.isSignedIn() && !this.auth.needsOnboarding()) {
      await this.router.navigateByUrl(this.destination(), { replaceUrl: true });
    }
  }

  protected finish(): void {
    void this.router.navigateByUrl(this.destination(), { replaceUrl: true });
  }

  /** Only same-origin paths are honoured, so a crafted link cannot send the creator off-site. */
  private destination(): string {
    const target = this.returnUrl() ?? '';
    return target.startsWith('/') && !target.startsWith('//') ? target : '/campaigns';
  }
}
