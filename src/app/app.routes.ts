import { Routes } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { AuthGuard } from './services/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { RecuperarContrasenaComponent } from './components/recuperar-contrasena/recuperar-contrasena.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

export const routes: Routes = [
	{ path: '', component: InicioComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'recuperar-contrasena', component: RecuperarContrasenaComponent },
	{ path: 'reset-password', component: ResetPasswordComponent },
	{ path: 'menu', component: MenuComponent, canActivate: [AuthGuard] },
	{ path: '**', redirectTo: 'login' }
];
