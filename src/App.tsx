import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline, Container, Typography, Button, Stack } from '@mui/material';
import { ltrCache, rtlCache } from './lib/rtlCache';
import { getTheme } from './lib/theme';
import { RTL_LANGUAGES } from './lib/i18n';

function App() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);

  const direction = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
  const theme = useMemo(() => getTheme(direction), [direction]);
  const cache = direction === 'rtl' ? rtlCache : ltrCache;

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  const toggleLanguage = () => {
    const next = language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(next);
    setLanguage(next);
  };

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container sx={{ py: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h4">{t('app.title')}</Typography>
            <Button variant="outlined" onClick={toggleLanguage} sx={{ alignSelf: 'flex-start' }}>
              {language === 'he' ? 'English' : 'עברית'}
            </Button>
          </Stack>
        </Container>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;
