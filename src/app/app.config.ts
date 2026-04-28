import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

// PrimeNG v18
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          // THE FIX: Tell PrimeNG to look for a class that does not exist.
          // This completely disables the OS-level `@media (prefers-color-scheme: dark)` check.
          darkModeSelector: '.app-never-dark' 
        }
      }
    })
  ]
};