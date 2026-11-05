import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { IonContent, IonItem, IonInput, IonButton, IonText, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { statsChartOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonItem, IonInput, IonButton, IonText, IonIcon],
})
export class LoginPage {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    addIcons({ statsChartOutline, mailOutline, lockClosedOutline });
  }

  private async goToApp(): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const destination = returnUrl?.startsWith('/tabs/') && !returnUrl.startsWith('//') ? returnUrl : '/tabs/tab1';

    await this.router.navigateByUrl(destination, { replaceUrl: true });
  }

  async login() {
    this.loading = true;
    this.error = '';

    try {
      await this.auth.login(this.email, this.password);
      await this.goToApp();
    } catch {
      this.error = 'No se pudo iniciar sesión. Verifique sus datos.';
    } finally {
      this.loading = false;
    }
  }

  async register() {
    this.loading = true;
    this.error = '';

    try {
      await this.auth.register(this.email, this.password);
      await this.goToApp();
    } catch {
      this.error = 'No se pudo registrar. Verifique el correo y la contraseña.';
    } finally {
      this.loading = false;
    }
  }
}
