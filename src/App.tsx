import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline, Container, Button } from '@mui/material';
import { ltrCache, rtlCache } from './lib/rtlCache';
import { getTheme } from './lib/theme';
import { RTL_LANGUAGES } from './lib/i18n';
import { AuthProvider } from './lib/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const { i18n } = useTranslation();
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
        <BrowserRouter>
          <AuthProvider>
            <Container sx={{ py: 4 }}>
              <Button variant="text" onClick={toggleLanguage} sx={{ mb: 2 }}>
                {language === 'he' ? 'English' : 'עברית'}
              </Button>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Container>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;
