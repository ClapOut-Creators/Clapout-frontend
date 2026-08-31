import { TestBed } from '@angular/core/testing';
import { provideAppConfiguration } from '../../core/config/app-environment';
import { FoundationHome } from './foundation-home';

describe('FoundationHome', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationHome],
      providers: [provideAppConfiguration()],
    }).compileComponents();
  });

  it('renders Phase 00 readiness copy and mock API state', async () => {
    const fixture = TestBed.createComponent(FoundationHome);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Frontend foundation');
    expect(compiled.textContent).toContain('MOCKED');
    expect(compiled.textContent).toContain('Mock repositories');
  });
});
