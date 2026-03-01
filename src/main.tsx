import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Notifications } from '@mantine/notifications';
import App from './App';
import { AppProvider } from './context/AppContext';
import '@fontsource-variable/inter';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <Notifications position="top-right" />
      <App />
    </AppProvider>
  </StrictMode>
);
