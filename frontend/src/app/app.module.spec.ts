import { ApplicationRef } from '@angular/core';
import { AppModule } from './app.module';
import { AppComponent } from './app.component';

describe('AppModule', () => {
	// Regression: listing a standalone component in @NgModule.bootstrap throws NG6009 at startup.
	// The module must bootstrap AppComponent through ngDoBootstrap instead.
	it('bootstraps AppComponent via ngDoBootstrap', () => {
		const appRef = { bootstrap: vi.fn() };

		new AppModule().ngDoBootstrap(appRef as unknown as ApplicationRef);

		expect(appRef.bootstrap).toHaveBeenCalledWith(AppComponent);
	});
});
