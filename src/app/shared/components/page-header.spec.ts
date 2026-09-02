import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header
      breadcrumb="Campaigns"
      breadcrumbTrail="E-wale"
      title="Campaign detail"
      subtitle="Campaign activity."
    />
  `,
})
class CampaignHeaderHost {}

@Component({ template: '' })
class EmptyRoute {}

describe('PageHeader', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders PrimeNG breadcrumb links for home and the section route', async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignHeaderHost],
      providers: [
        provideRouter([
          { path: 'admin/dashboard', component: EmptyRoute },
          { path: 'admin/campaigns', component: EmptyRoute },
        ]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CampaignHeaderHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('p-breadcrumb')).toBeTruthy();
    expect(element.querySelector('a[aria-label="Admin dashboard"]')?.getAttribute('href')).toBe(
      '/admin/dashboard',
    );
    expect(
      Array.from(element.querySelectorAll('a')).some(
        (link) => link.getAttribute('href') === '/admin/campaigns',
      ),
    ).toBe(true);
    expect(element.textContent).toContain('E-wale');
  });
});
