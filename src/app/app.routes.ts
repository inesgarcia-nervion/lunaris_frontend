import { Routes } from '@angular/router';
import { BookSearchComponent } from './components/book-search/book-search.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from './services/auth.guard';
import { RegisterComponent } from './components/register/register.component';

export const routes: Routes = [
	{ path: '', redirectTo: 'login', pathMatch: 'full' },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'search', component: BookSearchComponent, canActivate: [AuthGuard] },
	{ path: '**', redirectTo: 'login' }
];
