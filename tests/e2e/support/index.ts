/// <reference types="cypress" />

// Import custom commands
import './commands';

// Add global setup code here
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // Modify based on your application's requirements
  return false;
});

