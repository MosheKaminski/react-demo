import { createTheme } from '@mui/material/styles';
import type { Direction } from '@mui/material/styles';

export const getTheme = (direction: Direction) =>
  createTheme({
    direction,
    typography: {
      fontFamily: direction === 'rtl' ? 'Arial, sans-serif' : 'Roboto, Arial, sans-serif',
    },
  });
