import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './visual-corrections.css';
import './mobile-reading.css';
import './mobile-work-contact.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
