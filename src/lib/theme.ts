import { createTheme } from '@mui/material/styles';
import type { Direction } from '@mui/material/styles';

export const getTheme = (direction: Direction) =>
  createTheme({
    direction,
    palette: {
      primary: { main: '#2f5d62' },
      secondary: { main: '#c97b3d' },
      background: { default: '#f7f7f5' },
    },
    typography: {
      fontFamily:
        direction === 'rtl'
          ? '"Segoe UI", Arial, sans-serif'
          : '"Segoe UI", Roboto, Arial, sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiPaper: {
        defaultProps: { elevation: 1 },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600 },
        },
      },
    },
  });
