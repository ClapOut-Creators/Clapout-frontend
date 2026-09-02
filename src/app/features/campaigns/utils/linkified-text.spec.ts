import { TestBed } from '@angular/core/testing';
import { LinkifiedText, splitLinks } from './linkified-text';

describe('splitLinks', () => {
  it('returns nothing for empty copy', () => {
    expect(splitLinks(null)).toEqual([]);
    expect(splitLinks(undefined)).toEqual([]);
    expect(splitLinks('')).toEqual([]);
  });

  it('leaves prose without URLs untouched', () => {
    expect(splitLinks('Dial *714*22# and clip it.')).toEqual([
      { text: 'Dial *714*22# and clip it.', href: null },
    ]);
  });

  it('splits the WhatsApp invite out of a requirements note', () => {
    const note =
      'Join the chat community.\n\nLink  : https://chat.whatsapp.com/L9d71dKBrFy7QonMQJ73da';

    expect(splitLinks(note)).toEqual([
      { text: 'Join the chat community.\n\nLink  : ', href: null },
      {
        text: 'https://chat.whatsapp.com/L9d71dKBrFy7QonMQJ73da',
        href: 'https://chat.whatsapp.com/L9d71dKBrFy7QonMQJ73da',
      },
    ]);
  });

  it('gives protocol-less www links an https href without rewriting the label', () => {
    expect(splitLinks('See www.clapoutcreators.com for more')).toEqual([
      { text: 'See ', href: null },
      { text: 'www.clapoutcreators.com', href: 'https://www.clapoutcreators.com' },
      { text: ' for more', href: null },
    ]);
  });

  it('leaves sentence punctuation outside the link', () => {
    const [, link, tail] = splitLinks('Read https://example.com/brief, then post.');

    expect(link).toEqual({ text: 'https://example.com/brief', href: 'https://example.com/brief' });
    expect(tail).toEqual({ text: ', then post.', href: null });
  });

  it('keeps a bracket that the URL itself opened', () => {
    const [link] = splitLinks('https://example.com/a_(b)');

    expect(link.text).toBe('https://example.com/a_(b)');
  });

  it('always concatenates back to the original text', () => {
    const note = 'A https://a.example/one B www.b.example/two C';

    expect(
      splitLinks(note)
        .map((segment) => segment.text)
        .join(''),
    ).toBe(note);
  });
});

describe('LinkifiedText', () => {
  it('renders bare URLs as new-tab anchors', async () => {
    const fixture = TestBed.createComponent(LinkifiedText);
    fixture.componentRef.setInput('value', 'Link : https://chat.whatsapp.com/L9d71dKBrFy7');
    await fixture.whenStable();

    const anchor = (fixture.nativeElement as HTMLElement).querySelector('a');

    expect(anchor?.getAttribute('href')).toBe('https://chat.whatsapp.com/L9d71dKBrFy7');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Link : ');
  });
});
