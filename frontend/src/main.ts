import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';


if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppModule, {
  providers: [
  ],
})
.catch(err => console.error(err));

