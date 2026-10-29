import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import type { Incidencia, EstadoIncidencia } from '../models/incidencia.model';
import { IncidenciasService } from '../services/incidencias.service';
import { StorageService } from '../services/storage.service';

import { Tab1Page } from './tab1.page';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;
  let incidencias: Incidencia[];
  let incidenciaCreada: Subject<Incidencia>;
  let incidenciaActualizada: Subject<Incidencia>;

  const crearIncidencia = (id: string, estado: EstadoIncidencia): Incidencia => ({
    id,
    codigo: `INC-${id}`,
    tipo: 'bache',
    descripcion: 'Descripción',
    direccion: 'Dirección',
    sector: 'Sector',
    fecha: '2026-01-01T00:00:00.000Z',
    estado,
    prioridad: 'media',
    fotografia: '',
  });

  beforeEach(async () => {
    incidencias = [
      crearIncidencia('1', 'pendiente'),
      crearIncidencia('2', 'en_proceso'),
    ];
    incidenciaCreada = new Subject<Incidencia>();
    incidenciaActualizada = new Subject<Incidencia>();

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: IncidenciasService,
          useValue: {
            incidenciaCreada$: incidenciaCreada.asObservable(),
            incidenciaActualizada$: incidenciaActualizada.asObservable(),
            obtenerIncidencias: () => of(incidencias),
          },
        },
        {
          provide: StorageService,
          useValue: { obtenerCodigosSeguidos: async () => [] },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('recalculates the indicators when an incidence is created', async () => {
    incidencias = [...incidencias, crearIncidencia('3', 'resuelta')];
    incidenciaCreada.next(incidencias[2]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(component.totalIncidencias).toBe(3);
    expect(component.pendientes).toBe(1);
    expect(component.enProceso).toBe(1);
    expect(component.resueltas).toBe(1);
  });

  it('recalculates the indicators when an incidence is updated', async () => {
    incidencias = [
      crearIncidencia('1', 'resuelta'),
      incidencias[1],
    ];
    incidenciaActualizada.next(incidencias[0]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(component.totalIncidencias).toBe(2);
    expect(component.pendientes).toBe(0);
    expect(component.enProceso).toBe(1);
    expect(component.resueltas).toBe(1);
  });
});
