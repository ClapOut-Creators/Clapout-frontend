import { dedupeSocialUrls } from './socials-dialog';

/**
 * The only transformation the save applies. `PATCH /me` stores the list
 * verbatim, so two rows pointing at the same profile would be saved twice and
 * come back as two rows on the next visit.
 */
describe('dedupeSocialUrls', () => {
  it('trims each row and drops the empty ones', () => {
    expect(dedupeSocialUrls(['  https://www.tiktok.com/@ama  ', '', '   '])).toEqual([
      { url: 'https://www.tiktok.com/@ama' },
    ]);
  });

  it('keeps the first of two rows with the same link', () => {
    expect(
      dedupeSocialUrls([
        'https://www.tiktok.com/@ama',
        'https://www.instagram.com/ama',
        ' https://www.tiktok.com/@ama ',
      ]),
    ).toEqual([{ url: 'https://www.tiktok.com/@ama' }, { url: 'https://www.instagram.com/ama' }]);
  });

  it('treats links that differ only past the host as different profiles', () => {
    expect(
      dedupeSocialUrls(['https://www.tiktok.com/@ama', 'https://www.tiktok.com/@ama2']).length,
    ).toBe(2);
  });

  it('is an empty list when every row was cleared', () => {
    expect(dedupeSocialUrls(['', '  '])).toEqual([]);
  });
});
