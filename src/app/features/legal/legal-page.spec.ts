import { TestBed } from '@angular/core/testing';
import { LEGAL_CONTACT_EMAIL, PRIVACY_POLICY, TERMS_OF_SERVICE } from './legal-content';
import { LegalPage } from './legal-page';

describe('LegalPage', () => {
  async function render(title: string, kind?: 'terms' | 'privacy') {
    await TestBed.configureTestingModule({ imports: [LegalPage] }).compileComponents();
    const fixture = TestBed.createComponent(LegalPage);
    fixture.componentRef.setInput('title', title);
    if (kind) {
      fixture.componentRef.setInput('kind', kind);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  afterEach(() => TestBed.resetTestingModule());

  it('publishes the full Terms of Service, not a placeholder', async () => {
    const text = await render('Terms of Service', 'terms');

    expect(text).not.toContain('placeholder');
    expect(text).not.toContain('hello@clapout.co');
    for (const section of TERMS_OF_SERVICE) {
      expect(text).toContain(section.heading);
    }
    expect(text).toContain('Last updated: August 21, 2026');
    expect(text).toContain(LEGAL_CONTACT_EMAIL);
  });

  it('shows the Privacy Policy for the privacy route, even from the title alone', async () => {
    const text = await render('Privacy Policy');

    for (const section of PRIVACY_POLICY) {
      expect(text).toContain(section.heading);
    }
    expect(text).toContain('Data Protection Act, 2012');
    expect(text).not.toContain('Limitation of liability');
  });
});
