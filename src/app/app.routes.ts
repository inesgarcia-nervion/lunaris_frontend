
import { Routes } from '@angular/router';
import { MenuComponent } from './presentation/components/menu/menu.component';
import { LoginComponent } from './presentation/components/login/login.component';
import { InicioComponent } from './presentation/components/inicio/inicio.component';
import { AuthGuard } from './domain/services/auth.guard';
import { RegisterComponent } from './presentation/components/register/register.component';
import { RecuperarContrasenaComponent } from './presentation/components/recuperar-contrasena/recuperar-contrasena.component';
import { ResetPasswordComponent } from './presentation/components/reset-password/reset-password.component';
import { ListasUsuariosComponent } from './presentation/components/listas-usuarios/listas-usuarios.component';
import { ListaDetalleComponent } from './presentation/components/lista-detalle/lista-detalle.component';
import { PerfilComponent } from './presentation/components/perfil/perfil.component';
import { ConfiguracionComponent } from './presentation/components/configuracion/configuracion.component';
import { RuletaComponent } from './presentation/components/ruleta/ruleta.component';
import { NoticiasComponent } from './presentation/components/noticias/noticias.component';
import { NoticiasDetailComponent } from './presentation/components/noticias/noticias-detail.component';
import { AdminCreateBookComponent } from './presentation/components/admin-create-book/admin-create-book.component';
import { PeticionesComponent } from './presentation/components/peticiones/peticiones.component';
import { AdminPeticionesComponent } from './presentation/components/admin-peticiones/admin-peticiones.component';
import { BubbleFeedComponent } from './presentation/components/bubble-feed/bubble-feed.component';

/**
 * Definición de las rutas de la aplicación Angular, que mapea las URL a los componentes correspondientes.
 */
export const routes: Routes = [
	{ path: '', component: InicioComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'recuperar-contrasena', component: RecuperarContrasenaComponent },
	{ path: 'reset-password', component: ResetPasswordComponent },
	{ path: 'menu', component: MenuComponent, canActivate: [AuthGuard] },
	{ path: 'admin/create-book', component: AdminCreateBookComponent, canActivate: [AuthGuard] },
	{ path: 'peticiones', component: PeticionesComponent, canActivate: [AuthGuard] },
	{ path: 'admin/peticiones', component: AdminPeticionesComponent, canActivate: [AuthGuard] },
	{ path: 'listas-usuarios', component: ListasUsuariosComponent, canActivate: [AuthGuard] },
	{ path: 'listas/:id', component: ListaDetalleComponent, canActivate: [AuthGuard] },
	{ path: 'perfil', component: PerfilComponent, canActivate: [AuthGuard] },
	{ path: 'configuracion', component: ConfiguracionComponent, canActivate: [AuthGuard] },
	{ path: 'ruleta', component: RuletaComponent, canActivate: [AuthGuard] },
	{ path: 'noticias/:id', component: NoticiasDetailComponent, canActivate: [AuthGuard] },
	{ path: 'noticias', component: NoticiasComponent, canActivate: [AuthGuard] },
	{ path: 'bubble', component: BubbleFeedComponent, canActivate: [AuthGuard] },
	{ path: 'bubble/:id', component: BubbleFeedComponent, canActivate: [AuthGuard] },
	{ path: '**', redirectTo: 'login' }
];
