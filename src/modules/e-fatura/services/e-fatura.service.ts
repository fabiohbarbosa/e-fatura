import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as fs from 'fs';
import { lastValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';

import { Linha } from '@e-fatura/models/linha.model';
import { Fatura } from '@e-fatura/models/fatura.model';
import { props } from '@config/props';
import { Atividade } from '@e-fatura/models/atividade.enum';
import { EstadoDocumento } from '@e-fatura/models/estado-documento.enum';
import { DocumentFilter } from '@e-fatura/models/document-filter.model';

@Injectable()
export class EFaturaService {
  constructor(private readonly httpService: HttpService) {}

  async submitByNIF(
    year: number,
    nif: number,
    atividade: Atividade,
    onlyPendingEntries: boolean,
  ): Promise<void> {
    const linhasData = await this.getLinhasByNIF(year, nif, onlyPendingEntries);

    if (!linhasData) {
      Logger.error(`Nenhuma fatura encontrada para o nif=${nif}`);
      throw new NotFoundException();
    }

    const { nomeEmitente, linhas } = linhasData;

    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    Logger.log(`> emitente=${nomeEmitente} - aquisicao=${atividade}`);
    const headers = this.getHeaders();
    for (const { idDocumento, dataEmissaoDocumento } of linhas) {
      const url =
        'https://faturas.portaldasfinancas.gov.pt/resolverPendenciaAdquirente.action';

      Logger.log(`>> fatura=${idDocumento} data=${dataEmissaoDocumento}`);

      const response = await lastValueFrom(
        this.httpService.post(
          url,
          new URLSearchParams({
            idDocumento,
            ambitoAquisicaoPend: atividade,
          }),
          {
            headers: {
              ...headers,
              'Content-Type': 'application/x-www-form-urlencoded',
              Referer: `https://faturas.portaldasfinancas.gov.pt/detalheDocumentoAdquirente.action?idDocumento=${idDocumento}&dataEmissaoDocumento=${dataEmissaoDocumento}`,
            },
          },
        ),
      );

      if (response.status !== 200) {
        throw new Error(
          `Erro ao atualizar fatura=${idDocumento} data=${dataEmissaoDocumento}`,
        );
      }
    }
    Logger.log(`> total=${linhas.length}`);
    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
  }

  async autoSubmit(year: number): Promise<void> {
    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    const comerciantesAtividades = await this.getPreviousFilledEntries(year);

    Logger.log(
      `comerciantes preenchidos=${Object.keys(comerciantesAtividades).length}`,
    );

    Logger.log(`iniciando auto preenchimento de faturas`);

    const linhas = await this.getLinhas(
      new DocumentFilter(year, {
        estadoDocumentoFilter: EstadoDocumento.PENDENTE,
      }),
    );

    if (!linhas.length) {
      Logger.warn(`não existem faturas pendentes.`);
      return;
    }

    let totalAutoFill = 0;
    for (const { nifEmitente } of linhas) {
      const atividade = comerciantesAtividades[nifEmitente];
      if (!atividade) {
        Logger.warn(`nenhum registro encontrado o nif=${nifEmitente}`);
        continue;
      }
      await this.submitByNIF(year, nifEmitente, atividade, true);
      totalAutoFill = totalAutoFill + 1;
    }

    Logger.log(`total=${totalAutoFill}`);
    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
  }

  private async getPreviousFilledEntries(
    year: number,
  ): Promise<Record<string, Atividade>> {
    const lastYearEntries = await this.getLinhas(
      new DocumentFilter(year - 1, {
        estadoDocumentoFilter: EstadoDocumento.REGISTRADA,
      }),
    );

    const currentYearEntries = await this.getLinhas(
      new DocumentFilter(year, {
        estadoDocumentoFilter: EstadoDocumento.REGISTRADA,
      }),
    );

    const filledEntries = [...lastYearEntries, ...currentYearEntries];

    const mapByNIF = filledEntries.reduce((acc, linha) => {
      const existingValue = acc[linha.nifEmitente];

      // get most recently atividade entry
      const atividade =
        existingValue &&
        new Date(existingValue.dataEmissao).getTime() >
          new Date(linha.dataEmissaoDocumento).getTime()
          ? existingValue.atividade
          : linha.actividadeEmitente;

      return {
        [linha.nifEmitente]: {
          atividade,
          dataEmissao: new Date(linha.dataEmissaoDocumento),
        },
        ...acc,
      };
    }, {} as Record<number, { atividade: Atividade; dataEmissao: Date }>);

    // extract value for { nif: atividade }
    return Object.entries(mapByNIF).reduce((acc, [key, value]) => {
      return {
        [key]: value.atividade,
        ...acc,
      };
    }, {});
  }

  private async getLinhasByNIF(
    year: number,
    nif: number,
    onlyPendingEntries: boolean,
  ): Promise<{ nomeEmitente: string; linhas: Linha[] } | null> {
    const filter = new DocumentFilter(year, {
      nifEmitenteFilter: nif,
    });

    if (onlyPendingEntries) {
      filter.estadoDocumentoFilter = EstadoDocumento.PENDENTE;
    }

    const linhas = await this.getLinhas(filter);
    if (!linhas.length) return null;

    return {
      nomeEmitente: linhas[0].nomeEmitente,
      linhas,
    };
  }

  private async getLinhas(filters: DocumentFilter): Promise<Linha[]> {
    const headers = this.getHeaders();
    const urlencoded = new URL(
      'https://faturas.portaldasfinancas.gov.pt/json/obterDocumentosAdquirente.action',
    );

    Object.entries(filters).forEach(([field, value]) => {
      urlencoded.searchParams.append(field, value);
    });

    const url = urlencoded.toString();

    const responseData = (
      await lastValueFrom(this.httpService.get(url, { headers }))
    ).data;

    if (!responseData.success) {
      throw new Error(
        `Error to load documents: ${JSON.stringify(responseData)}`,
      );
    }

    if (responseData.expiredSession) {
      throw new Error(`Section expired`);
    }

    const linhas = Fatura.deserialize(responseData).linhas;
    if (!linhas.length) return [];

    return linhas;
  }

  private getHeaders = (): Record<string, string> => ({
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en,pt;q=0.9,pt-PT;q=0.8,en-US;q=0.7,es;q=0.6',
    Connection: 'keep-alive',
    Referer:
      'https://faturas.portaldasfinancas.gov.pt/consultarDocumentosAdquirente.action',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua':
      '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    cookie: fs
      .readFileSync(props.cookiePath)
      .toString('utf-8')
      .replace(/(\r\n|\n|\r)/gm, ''),
  });
}
