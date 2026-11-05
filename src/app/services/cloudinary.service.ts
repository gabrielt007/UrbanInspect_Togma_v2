import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../environments/environment';

interface CloudinaryUploadResponse {
  secure_url?: string;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly http = inject(HttpClient);

  async subirImagen(dataUrl: string): Promise<string> {
    const cloudName = environment.cloudinaryCloudName;
    const uploadPreset = environment.cloudinaryUploadPreset;
    if (!cloudName || !uploadPreset) {
      throw new Error('La configuración de Cloudinary está incompleta.');
    }

    const match = /^data:(image\/[\w.+-]+);base64,([\s\S]+)$/.exec(dataUrl);
    if (!match) {
      throw new Error('La imagen debe ser una imagen Base64 válida.');
    }

    const mimeType = match[1];
    const binary = atob(match[2]);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: mimeType }), `incidencia.${extension}`);
    formData.append('upload_preset', uploadPreset);

    const response = await firstValueFrom(
      this.http
        .post<CloudinaryUploadResponse>(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
          formData,
        )
        .pipe(timeout(30_000)),
    );

    if (!response.secure_url) {
      throw new Error('Cloudinary no devolvió la URL segura de la imagen.');
    }

    return response.secure_url;
  }
}
