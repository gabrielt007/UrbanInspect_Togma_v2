import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { vi } from 'vitest';

import { StorageService } from './storage.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('StorageService', () => {
  let service: StorageService;
  let savedValue: string | null;

  beforeEach(() => {
    vi.clearAllMocks();
    savedValue = null;
    vi.mocked(Preferences.get).mockImplementation(async () => ({ value: savedValue }));
    vi.mocked(Preferences.set).mockImplementation(async ({ value }) => {
      savedValue = value;
    });
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('recovers unique non-empty tracking codes from Preferences', async () => {
    savedValue = JSON.stringify(['INC-1', 'INC-1', '', 3, ' INC-2 ']);

    await expect(service.obtenerCodigosSeguidos()).resolves.toEqual(['INC-1', 'INC-2']);
  });

  it('serializes concurrent additions and avoids duplicate tracking codes', async () => {
    await Promise.all([
      service.agregarCodigoSeguido('INC-1'),
      service.agregarCodigoSeguido('INC-2'),
      service.agregarCodigoSeguido('INC-1'),
    ]);

    await expect(service.obtenerCodigosSeguidos()).resolves.toEqual(['INC-1', 'INC-2']);
  });

  it('removes a code from local Preferences without affecting remote data', async () => {
    savedValue = JSON.stringify(['INC-1', 'INC-2']);

    await service.eliminarCodigoSeguido('INC-1');

    await expect(service.obtenerCodigosSeguidos()).resolves.toEqual(['INC-2']);
    expect(Preferences.set).toHaveBeenCalledTimes(1);
  });
});
