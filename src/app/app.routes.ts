import { Routes } from '@angular/router';
import { BookSearchComponent } from './components/book-search/book-search.component';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { AuthGuard } from './services/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { RecuperarContrasenaComponent } from './components/recuperar-contrasena/recuperar-contrasena.component';

export const routes: Routes = [
	{ path: '', component: InicioComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'recuperar-contrasena', component: RecuperarContrasenaComponent },
	{ path: 'search', component: BookSearchComponent, canActivate: [AuthGuard] },
	{ path: '**', redirectTo: 'login' }
];
