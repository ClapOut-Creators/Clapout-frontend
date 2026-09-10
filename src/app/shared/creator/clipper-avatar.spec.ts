import { TestBed } from '@angular/core/testing';
import { ClipperAvatar, clipperAvatarUrl } from './clipper-avatar';

describe('clipperAvatarUrl', () => {
  it('seeds the DiceBear avataaars-neutral style with the clipper id, at 2x for crisp rendering', () => {
    const url = new URL(clipperAvatarUrl('cmtui86ol0001wiesm7e2c7wl', 32));

    expect(url.origin + url.pathname).toBe('https://api.dicebear.com/9.x/avataaars-neutral/svg');
    expect(url.searchParams.get('seed')).toBe('cmtui86ol0001wiesm7e2c7wl');
    expect(url.searchParams.get('radius')).toBe('50');
    expect(url.searchParams.get('size')).toBe('64');
  });

  it('is stable for the same clipper and different for another', () => {
    expect(clipperAvatarUrl('a', 40)).toBe(clipperAvatarUrl('a', 40));
    expect(clipperAvatarUrl('a', 40)).not.toBe(clipperAvatarUrl('b', 40));
  });
});

describe('ClipperAvatar', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the seeded image, and falls back to initials when it cannot load', async () => {
    await TestBed.configureTestingModule({ imports: [ClipperAvatar] }).compileComponents();
    const fixture = TestBed.createComponent(ClipperAvatar);
    fixture.componentRef.setInput('seed', 'creator-1');
    fixture.componentRef.setInput('name', 'Ama Mensah');
    fixture.componentRef.setInput('size', 30);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const img = element.querySelector('img');
    expect(img?.getAttribute('src')).toContain('seed=creator-1');
    expect(img?.getAttribute('width')).toBe('30');

    img?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent?.trim()).toBe('AM');
  });
});
