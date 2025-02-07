import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Atividade } from '@e-fatura/models/atividade.enum';
import { EstadoDocumento } from '@e-fatura/models/estado-documento.enum';
import { DocumentFilter } from '@e-fatura/models/document-filter.model';
import { FaturaRepository } from '@e-fatura/repositories/fatura.repository';
import { Stats } from '@e-fatura/models/stats.model';
import { Fatura } from '@e-fatura/models/fatura.model';
import { TipoDocumentoHelper } from '@e-fatura/models/tipo-documento.enum';
import { ComercianteRepository } from '@e-fatura/repositories/comerciante.repository';
import { Comerciante } from '@e-fatura/models/comerciante.model';

type Total = Record<number, { empresa: string; total: number }>;

type MapByNIF = Record<number, { atividade: Atividade; dataEmissao: Date }>;

@Injectable()
export class EFaturaService {
  constructor(
    private readonly httpService: HttpService,
    private readonly faturaRepository: FaturaRepository,
    private readonly empresaRepository: ComercianteRepository,
  ) {}

  async submitByNIF(
    year: number,
    nif: number,
    atividade: Atividade,
    onlyPendingEntries: boolean,
  ): Promise<void> {
    const faturas = await this.faturaRepository.getByNIF(
      year,
      nif,
      onlyPendingEntries,
    );

    if (!faturas.length) {
      Logger.error(`nenhuma fatura encontrada para o nif=${nif}`);
      throw new NotFoundException();
    }

    const nomeEmitente = faturas[0].nomeEmitente;
    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    Logger.log(
      `> emitente=${nomeEmitente} - nif=${nif} - atividade=${atividade}`,
    );
    for (const fatura of faturas) {
      Logger.log(
        `>> fatura=${fatura.idDocumento} data=${fatura.dataEmissaoDocumento}`,
      );
      await this.faturaRepository.submit(fatura, atividade);
    }
    Logger.log(`> total=${faturas.length}`);
  }

  async autoSubmit(year: number): Promise<void> {
    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    const comerciantesAtividades = await this.getPreviousFilledEntries(year);

    Logger.log(
      `comerciantes preenchidos=${Object.keys(comerciantesAtividades).length}`,
    );

    Logger.log(`iniciando auto preenchimento de faturas para o ano=${year}`);

    const faturas = await this.getFaturasGroupByNIF(year);
    if (!faturas.length) {
      Logger.warn(`não existem faturas pendentes para o ano=${year}`);
      Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
      return;
    }

    let totalAutoFill = 0;
    for (const comerciante of faturas) {
      const { nifEmitente } = comerciante;
      const atividade = comerciantesAtividades[nifEmitente];
      if (!atividade) {
        Logger.warn(`nenhum registro encontrado para o nif=${nifEmitente} `);
        continue;
      }
      await this.submitByNIF(year, nifEmitente, atividade, true);
      totalAutoFill = totalAutoFill + 1;
    }

    Logger.log(`total=${totalAutoFill} faturas preenchidas - ano=${year}`);
    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
  }

  private async getPreviousFilledEntries(year: number): Promise<Comerciante> {
    const lastOneYearEntries = await this.getFaturasByYear(year - 1);
    const lastTwoYearEntries = await this.getFaturasByYear(year - 2);
    const currentYearEntries = await this.getFaturasByYear(year);

    const filledEntries = [
      ...lastOneYearEntries,
      ...lastTwoYearEntries,
      ...currentYearEntries,
    ];

    const mapByNIF = filledEntries.reduce((acc, fatura) => {
      const existingValue = acc[fatura.nifEmitente];

      // get most recent entry
      const atividade =
        existingValue &&
        new Date(existingValue.dataEmissao).getTime() >
          new Date(fatura.dataEmissaoDocumento).getTime()
          ? existingValue.atividade
          : fatura.actividadeEmitente;

      return {
        ...acc,
        [fatura.nifEmitente]: {
          atividade,
          dataEmissao: new Date(fatura.dataEmissaoDocumento),
        },
      };
    }, {} as MapByNIF);

    // extract value for { nif: atividade }
    const comerciantesFromEntries = Object.entries(mapByNIF).reduce(
      (acc, [key, value]) => {
        return {
          ...acc,
          [key]: value.atividade,
        };
      },
      {} as Comerciante,
    );

    const comerciantesFromDatabase = this.empresaRepository.findAll();
    const allComerciantes: Comerciante = {
      ...comerciantesFromDatabase,
      ...comerciantesFromEntries, // overwrite values from database from new entries
    };

    this.empresaRepository.insert(allComerciantes);

    return allComerciantes;
  }

  private async getFaturasByYear(year: number): Promise<Fatura[]> {
    const tiposDocument = TipoDocumentoHelper.values();

    const promises = tiposDocument.map((tipoDocumento) => {
      return this.faturaRepository.getByFilter(
        new DocumentFilter(year, {
          tipoDocumentoFilter: tipoDocumento,
          estadoDocumentoFilter: EstadoDocumento.REGISTRADA,
        }),
      );
    });

    return (await Promise.all(promises)).flat();
  }

  async getByYear(year: number, nif?: number): Promise<Stats[]> {
    const faturas = await this.faturaRepository.getByFilter(
      new DocumentFilter(year, nif ? { nifEmitenteFilter: nif } : undefined),
    );

    const total = faturas.reduce((acc, fatura) => {
      const nifEmitente = fatura.nifEmitente;
      const total = acc[nifEmitente]
        ? acc[nifEmitente].total + fatura.valorTotal
        : fatura.valorTotal;

      return {
        ...acc,
        [nifEmitente]: {
          empresa: fatura.nomeEmitente,
          total,
        },
      };
    }, {} as Total);

    return Object.entries(total)
      .map(
        ([nif, { empresa, total }]) =>
          ({
            nif: Number(nif),
            empresa,
            total,
          } as Stats),
      )
      .sort((a, b) => (a.total > b.total ? -1 : 1));
  }

  private async getFaturasGroupByNIF(year: number): Promise<Fatura[]> {
    const faturas = await this.faturaRepository.getByFilter(
      new DocumentFilter(year, {
        estadoDocumentoFilter: EstadoDocumento.PENDENTE,
      }),
    );

    if (!faturas.length) {
      return [];
    }

    const setOfFaturasByNIF = faturas.reduce((acc, fatura) => {
      const nifEmitente = fatura.nifEmitente;
      const existingValue = acc[nifEmitente];
      if (existingValue) {
        return acc;
      }
      return {
        ...acc,
        [nifEmitente]: fatura,
      };
    }, {} as Record<number, Fatura>);

    return Object.values(setOfFaturasByNIF);
  }
}
