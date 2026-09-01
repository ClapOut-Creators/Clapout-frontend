import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const clapoutPreset = definePreset(Aura, {
  semantic: {
    // Ramp anchored on the landing page's brand orange (#EC612C, see the
    // website repo's tailwind.config.js `brand.orange`); yellow accent is
    // exposed as --clapout-accent in styles.css.
    primary: {
      50: '#fdf3ef',
      100: '#fbe2d8',
      200: '#f7c4b0',
      300: '#f3a385',
      400: '#ef8259',
      500: '#ec612c',
      600: '#d54e1c',
      700: '#b04117',
      800: '#8c3412',
      900: '#69270e',
      950: '#3c1608',
    },
    focusRing: {
      color: '{primary.600}',
      offset: '2px',
      shadow: '0 0 0 3px color-mix(in srgb, {primary.500} 24%, transparent)',
      style: 'solid',
      width: '2px',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#fffaf4',
          100: '#f8f1e8',
          200: '#eee3d5',
          300: '#ded0c0',
          400: '#bda894',
          500: '#9b8573',
          600: '#756354',
          700: '#57493f',
          800: '#372f2a',
          900: '#201b18',
          950: '#11100e',
        },
      },
    },
  },
});
