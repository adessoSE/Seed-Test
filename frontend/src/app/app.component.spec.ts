import { TestBed, waitForAsync, ComponentFixture} from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { importProvidersFrom, NO_ERRORS_SCHEMA } from '@angular/core';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { DatePipe } from '@angular/common';


describe('AppComponent', () => {
	let component: AppComponent;
	let fixture: ComponentFixture<AppComponent>;
  
	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
    imports: [HttpClientTestingModule, MatSnackBarModule],
    providers: [provideRouter([]), DatePipe,
        importProvidersFrom(LoggerModule.forRoot({
            serverLoggingUrl: '/api/logs',
            level: NgxLoggerLevel.DEBUG,
            serverLogLevel: NgxLoggerLevel.ERROR
        }))],
    declarations: [AppComponent],
    schemas: [NO_ERRORS_SCHEMA]
}).compileComponents();
	}));

	beforeEach(()=> {
		fixture = TestBed.createComponent(AppComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create the app', () => {
		expect(component).toBeTruthy();
	});
});
