import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Button,
  Container,
  Box,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  type Theme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import PaidIcon from '@mui/icons-material/Paid';
import PersonIcon from '@mui/icons-material/Person';
import TranslateIcon from '@mui/icons-material/Translate';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../lib/useAuth';
import { RTL_LANGUAGES } from '../lib/i18n';

interface AppLayoutProps {
  children: ReactNode;
  language: string;
  onToggleLanguage: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export function AppLayout({ children, language, onToggleLanguage }: AppLayoutProps) {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems: NavItem[] = [
    { to: '/', label: t('nav.dashboard'), icon: <DashboardIcon /> },
    ...(profile?.role === 'admin'
      ? [{ to: '/branches', label: t('nav.branches'), icon: <StoreIcon /> }]
      : []),
    ...(profile?.role === 'admin' || profile?.role === 'branch_manager'
      ? [{ to: '/employees', label: t('nav.employees'), icon: <PeopleIcon /> }]
      : []),
    { to: '/attendance', label: t('nav.attendance'), icon: <AccessTimeIcon /> },
    { to: '/shifts', label: t('nav.shifts'), icon: <EventIcon /> },
    ...(profile?.role === 'admin'
      ? [{ to: '/payroll', label: t('nav.payroll'), icon: <PaidIcon /> }]
      : []),
    { to: '/me', label: t('nav.myProfile'), icon: <PersonIcon /> },
  ];

  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          {isMobile && (
            <IconButton
              edge="start"
              aria-label={t('nav.menu')}
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>
            {t('app.title')}
          </Typography>
          {!isMobile &&
            navItems.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                startIcon={item.icon}
                color={location.pathname === item.to ? 'primary' : 'inherit'}
              >
                {item.label}
              </Button>
            ))}
          <IconButton onClick={onToggleLanguage} aria-label={t('nav.toggleLanguage')}>
            <TranslateIcon />
          </IconButton>
          {!isMobile && (
            <Button onClick={() => signOut()} startIcon={<LogoutIcon />}>
              {t('nav.logout')}
            </Button>
          )}
          {isMobile && (
            <IconButton onClick={() => signOut()} aria-label={t('nav.logout')}>
              <LogoutIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor={RTL_LANGUAGES.includes(language) ? 'right' : 'left'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 260 }} role="presentation">
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={location.pathname === item.to}
                onClick={() => setDrawerOpen(false)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <List>
            <ListItemButton onClick={() => signOut()}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary={t('nav.logout')} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Container sx={{ py: 4 }}>{children}</Container>
    </Box>
  );
}
