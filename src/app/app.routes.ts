
import { Routes } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';
import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { AuthGuard } from './services/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { RecuperarContrasenaComponent } from './components/recuperar-contrasena/recuperar-contrasena.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ListasUsuariosComponent } from './components/listas-usuarios/listas-usuarios.component';
import { ListaDetalleComponent } from './components/lista-detalle/lista-detalle.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';

export const routes: Routes = [
	{ path: '', component: InicioComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'recuperar-contrasena', component: RecuperarContrasenaComponent },
	{ path: 'reset-password', component: ResetPasswordComponent },
	{ path: 'menu', component: MenuComponent, canActivate: [AuthGuard] },
	{ path: 'listas-usuarios', component: ListasUsuariosComponent, canActivate: [AuthGuard] },
	{ path: 'listas/:id', component: ListaDetalleComponent, canActivate: [AuthGuard] },
	{ path: 'perfil', component: PerfilComponent, canActivate: [AuthGuard] },
	{ path: 'configuracion', component: ConfiguracionComponent, canActivate: [AuthGuard] },
	{ path: '**', redirectTo: 'login' }
];
