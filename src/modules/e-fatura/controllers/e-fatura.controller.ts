import {
  Controller,
  Logger,
  NotFoundException,
  Param,
  ParseEnumPipe,
  Patch,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';
import { Aquisicao } from '@e-fatura/controllers/aquisicao';
import { FaturaResponse } from '@e-fatura/controllers/fatura.response';
import { Linha } from '@e-fatura/controllers/linha';

@Controller('/e-fatura')
export class EFaturaController {
  constructor(protected readonly httpService: HttpService) {}

  @Patch(':nif/:aquisicao')
  async patch(
    @Param('nif') nif: string,
    @Param('aquisicao', new ParseEnumPipe(Aquisicao)) aquisicao: Aquisicao,
  ): Promise<void> {
    const headers = {
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
      Cookie:
        'TS01682a56=01e43c52fed2fb3517294e0cd24a210ef3ae68f586aeec601089736ca9f84b992aeff1ba32891623b63460ff984ef6cccd2bd55730f917c8b8c3b9ff9fd10389dd1be98791; ATAUTH_SSO_COOKIE=786471402; factemipf_JSessionID=8lvPuGWos_RTiTaLThmUwLJNy7F-DaZKk-eRZxhWLhLazii1AWxJ!-2133066482!-1620641108; SINGLE_DOMAIN_SSO_COOKIE=Mjk0MDc4NzAz; AT_P=!pMFNvH7SlkMSGsYniRQ8ePlsVqP62/+8kzEaBm5ON4chwx6mw1nwBpMbBQTj0B7VAxdYz17xJVMwpNA=; TS684eac08027=08def0a5edab2000e8bd162ed44597e3a1e3bca1b9d3c5637a16ac2dbf0c1ed5d272935d6d287b33086e414b131130009eade549fe7dca677e3bdfbb8403a91bd9d3697b8d9f2efcb7712feab8457249117aec4d5b56824dd1fa908090f4fd7a',
    };

    const linhasData = await this.getLinhas(nif, headers);

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

  private async getLinhas(
    nif: string,
    headers: Record<string, string | number>,
  ): Promise<{ nomeEmitente: string; linhas: Linha[] } | null> {
    const urlencoded = new URL(
      'https://faturas.portaldasfinancas.gov.pt/json/obterDocumentosAdquirente.action',
    );
    urlencoded.searchParams.append('nifEmitenteFilter', nif);
    urlencoded.searchParams.append('dataInicioFilter', '2022-01-01');
    urlencoded.searchParams.append('dataFimFilter', '2022-12-31');
    urlencoded.searchParams.append('estadoDocumentoFilter', 'P');
    urlencoded.searchParams.append('ambitoAquisicaoFilter', 'TODOS');

    const url = urlencoded.toString();

    const response = await lastValueFrom(
      this.httpService.get(url, { headers }),
    );

    const linhas = FaturaResponse.deserialize(response.data).linhas;
    if (!linhas.length) return null;

    return {
      nomeEmitente: linhas[0].nomeEmitente,
      linhas,
    };
  }
}
