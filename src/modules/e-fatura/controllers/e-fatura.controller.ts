import {
  Controller,
  DefaultValuePipe,
  Logger,
  NotFoundException,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';
import { Aquisicao } from '@e-fatura/controllers/aquisicao';
import { FaturaResponse } from '@e-fatura/controllers/fatura.response';
import { Linha } from '@e-fatura/controllers/linha';
import * as fs from 'fs';
import { props } from '@config/props';

@Controller('/e-fatura')
export class EFaturaController {
  constructor(protected readonly httpService: HttpService) {}

  @Patch(':nif/:aquisicao')
  async patch(
    @Param('nif') nif: string,
    @Param('aquisicao', new ParseEnumPipe(Aquisicao)) aquisicao: Aquisicao,
    @Query('somentePendentes', new DefaultValuePipe(true), ParseBoolPipe)
    onlyPendingEntries: boolean,
  ): Promise<void> {
    const headers = this.getHeader();
    const linhasData = await this.getLinhas(nif, headers, onlyPendingEntries);

    if (!linhasData) {
      Logger.error(`Nenhuma fatura encontrada para o nif=${nif}`);
      throw new NotFoundException();
    }

    const { nomeEmitente, linhas } = linhasData;

    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    Logger.log(`emitente=${nomeEmitente} - aquisicao=${aquisicao}`);
    for (const { idDocumento, dataEmissaoDocumento } of linhas) {
      const url =
        'https://faturas.portaldasfinancas.gov.pt/resolverPendenciaAdquirente.action';

      Logger.log(`> fatura=${idDocumento} data=${dataEmissaoDocumento}`);

      const response = await lastValueFrom(
        this.httpService.post(
          url,
          new URLSearchParams({
            idDocumento,
            ambitoAquisicaoPend: aquisicao,
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
    Logger.log(`total=${linhas.length}`);
    Logger.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
  }

  private getHeader(): Record<string, string> {
    const cookie = fs
      .readFileSync(props.cookiePath)
      .toString('utf-8')
      .replace(/(\r\n|\n|\r)/gm, '');

    return {
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
      cookie,
    };
  }

  private async getLinhas(
    nif: string,
    headers: Record<string, string | number>,
    onlyPendingEntries: boolean,
  ): Promise<{ nomeEmitente: string; linhas: Linha[] } | null> {
    const urlencoded = new URL(
      'https://faturas.portaldasfinancas.gov.pt/json/obterDocumentosAdquirente.action',
    );
    urlencoded.searchParams.append('nifEmitenteFilter', nif);
    urlencoded.searchParams.append('dataInicioFilter', '2022-01-01');
    urlencoded.searchParams.append('dataFimFilter', '2022-12-31');
    urlencoded.searchParams.append('ambitoAquisicaoFilter', 'TODOS');
    // filter by pending documents
    if (onlyPendingEntries) {
      urlencoded.searchParams.append('estadoDocumentoFilter', 'P');
    }

    const url = urlencoded.toString();

    const responseData = (
      await lastValueFrom(this.httpService.get(url, { headers }))
    ).data;

    if (responseData.expiredSession) {
      throw new Error(`Section expired`);
    }

    const linhas = FaturaResponse.deserialize(responseData).linhas;
    if (!linhas.length) return null;

    return {
      nomeEmitente: linhas[0].nomeEmitente,
      linhas,
    };
  }
}
