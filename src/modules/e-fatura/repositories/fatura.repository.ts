import { Injectable, Scope } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Fatura } from '@e-fatura/models/fatura.model';
import { DocumentFilter } from '@e-fatura/models/document-filter.model';
import { EstadoDocumento } from '@e-fatura/models/estado-documento.enum';
import { lastValueFrom } from 'rxjs';
import { Documentos } from '@e-fatura/models/documentos.model';
import { URLSearchParams } from 'url';
import { Atividade } from '@e-fatura/models/atividade.enum';
import * as fs from 'fs';
import { props } from '@config/props';

@Injectable({ scope: Scope.REQUEST })
export class FaturaRepository {
  constructor(private readonly httpService: HttpService) {}

  async getByNIF(
    year: number,
    nif: number,
    onlyPendingEntries: boolean,
  ): Promise<Fatura[]> {
    const filter = new DocumentFilter(year, {
      nifEmitenteFilter: nif,
    });

    if (onlyPendingEntries) {
      filter.estadoDocumentoFilter = EstadoDocumento.PENDENTE;
    }

    return this.getByFilter(filter);
  }

  async getByFilter(filters: DocumentFilter): Promise<Fatura[]> {
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

    const faturas = Documentos.deserialize(responseData).linhas;
    if (!faturas.length) return [];

    return faturas;
  }

  async submit(
    { idDocumento, dataEmissaoDocumento }: Fatura,
    atividade: Atividade,
  ): Promise<void> {
    const response = await lastValueFrom(
      this.httpService.post(
        'https://faturas.portaldasfinancas.gov.pt/resolverPendenciaAdquirente.action',
        new URLSearchParams({
          idDocumento,
          ambitoAquisicaoPend: atividade,
        }),
        {
          headers: {
            ...this.getHeaders(),
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

  private getCookie = () =>
    fs
      .readFileSync(props.cookiePath)
      .toString('utf-8')
      .replace(/(\r\n|\n|\r)/gm, '');

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
    cookie: this.getCookie(),
  });
}
