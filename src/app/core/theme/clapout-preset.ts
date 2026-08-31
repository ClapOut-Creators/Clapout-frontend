import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const clapoutPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407',
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
