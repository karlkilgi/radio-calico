import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

// Setup MSW server with our handlers
export const server = setupServer(...handlers);

// Helper to add runtime handlers
export const addHandler = (handler) => {
  server.use(handler);
};

// Helper to reset handlers
export const resetHandlers = () => {
  server.resetHandlers(...handlers);
};