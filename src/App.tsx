import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ltrCache, rtlCache } from './lib/rtlCache';
import { getTheme } from './lib/theme';
import { RTL_LANGUAGES } from './lib/i18n';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './lib/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BranchesPage } from './pages/BranchesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { AttendancePage } from './pages/AttendancePage';
import { ShiftsPage } from './pages/ShiftsPage';
import { PayrollPage } from './pages/PayrollPage';

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
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout onToggleLanguage={toggleLanguage}>
                        <DashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/branches"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AppLayout onToggleLanguage={toggleLanguage}>
                        <BranchesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employees"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
                      <AppLayout onToggleLanguage={toggleLanguage}>
                        <EmployeesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/me"
                  element={
                    <ProtectedRoute>
                      <AppLayout onToggleLanguage={toggleLanguage}>
                        <MyProfilePage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance"
                  element={
                    <ProtectedRoute>
                      <AppLayout onToggleLanguage={toggleLanguage}>
                        <AttendancePage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/shifts"
                  element={
                    <ProtectedRoute>
                      <AppLayout onToggleLanguage={toggleLanguage}>
                        <ShiftsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AppLayout onToggleLanguage={toggleLanguage}>
                        <PayrollPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
}

export default App;
