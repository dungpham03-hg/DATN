import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Import CSS
import 'react-datepicker/dist/react-datepicker.css';
import './index.css';
import './styles/modern-effects.css';

// Font loading optimization
if ('fonts' in document) {
  document.fonts.ready.then(() => {
    document.documentElement.classList.add('font-loaded');
  });
}

// Lấy client ID từ biến môi trường
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
  </React.StrictMode>
); 