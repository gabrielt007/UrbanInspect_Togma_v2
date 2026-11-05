import { Injectable } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth, User, UserCredential } from 'firebase/auth';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

function getFirebaseAuth(): Auth {
  const config = environment.firebase;
  if (!config?.apiKey || !config.projectId || !config.appId) {
    throw new Error('La configuración de Firebase Auth no está disponible.');
  }

  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  get isConfigured(): boolean {
    const config = environment.firebase;
    return Boolean(config?.apiKey && config.projectId && config.appId);
  }

  user$ = new Observable<User | null>((subscriber) => {
    if (!this.isConfigured) {
      subscriber.next(null);
      subscriber.complete();
      return;
    }

    const unsubscribe = onAuthStateChanged(
      getFirebaseAuth(),
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
    );

    return unsubscribe;
  });

  register(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }

  logout(): Promise<void> {
    return signOut(getFirebaseAuth());
  }
}
