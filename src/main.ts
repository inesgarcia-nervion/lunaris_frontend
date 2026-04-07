import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/**
 * Punto de entrada principal de la aplicación Angular, que arranca la aplicación utilizando el componente raíz `App`
 * y la configuración global definida en `appConfig`. Si ocurre algún error durante el arranque de la aplicación,
 * se captura y se muestra en la consola.
 */
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
