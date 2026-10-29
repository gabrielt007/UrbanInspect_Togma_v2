import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import type { EstadoIncidencia, Incidencia } from '../models/incidencia.model';
import { IncidenciasService } from '../services/incidencias.service';
import { StorageService } from '../services/storage.service';

import { Tab3Page } from './tab3.page';

describe('Tab3Page', () => {
  let component: Tab3Page;
  let fixture: ComponentFixture<Tab3Page>;
  let codigosSeguidos: string[];
  let incidencias: Incidencia[];
  let incidenciaCreada: Subject<Incidencia>;
  let incidenciaActualizada: Subject<Incidencia>;
  let buscarPorCodigo: ReturnType<typeof vi.fn>;

  const crearIncidencia = (codigo: string, estado: EstadoIncidencia = 'pendiente'): Incidencia => ({
    id: codigo,
    codigo,
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
    codigosSeguidos = [];
    incidencias = [];
    incidenciaCreada = new Subject<Incidencia>();
    incidenciaActualizada = new Subject<Incidencia>();
    buscarPorCodigo = vi.fn((codigo: string) =>
      of(incidencias.filter((incidencia) => incidencia.codigo.startsWith(codigo))),
    );

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: IncidenciasService,
          useValue: {
            incidenciaCreada$: incidenciaCreada.asObservable(),
            incidenciaActualizada$: incidenciaActualizada.asObservable(),
            buscarPorCodigo,
          },
        },
        {
          provide: StorageService,
          useValue: {
            obtenerCodigosSeguidos: async () => codigosSeguidos,
            eliminarCodigoSeguido: async (codigo: string) => {
              codigosSeguidos = codigosSeguidos.filter((guardado) => guardado !== codigo);
            },
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('recovers followed codes and only shows exact existing incidence matches', async () => {
    codigosSeguidos = ['INC-1'];
    incidencias = [crearIncidencia('INC-10'), crearIncidencia('INC-1')];

    await component.cargarIncidenciasSeguidas();

    expect(component.incidenciasSeguidas.map((incidencia) => incidencia.codigo)).toEqual(['INC-1']);
  });

  it('refreshes followed incidence data after it is updated elsewhere', async () => {
    const incidencia = crearIncidencia('INC-1', 'resuelta');
    codigosSeguidos = [incidencia.codigo];
    incidencias = [incidencia];

    await component.cargarIncidenciasSeguidas();
    incidenciaActualizada.next(incidencia);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(component.incidenciasSeguidas[0].estado).toBe('resuelta');
  });

  it('removes a follow locally without deleting the remote incidence', async () => {
    const incidencia = crearIncidencia('INC-1');
    codigosSeguidos = [incidencia.codigo];
    component.incidenciasSeguidas = [incidencia];

    await component.dejarDeSeguir(incidencia);

    expect(codigosSeguidos).toEqual([]);
    expect(component.incidenciasSeguidas).toEqual([]);
    expect(buscarPorCodigo).not.toHaveBeenCalled();
  });
});
