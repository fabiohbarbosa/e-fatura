import { EstadoDocumento } from '@e-fatura/models/estado-documento.enum';

export class DocumentFilter {
  nifEmitenteFilter?: number;
  estadoDocumentoFilter?: EstadoDocumento;

  private dataInicioFilter: string;
  private dataFimFilter: string;
  private ambitoAquisicaoFilter = 'TODOS';

  constructor(year: number, partial?: Partial<DocumentFilter>) {
    return Object.assign(this, {
      ...partial,
      dataInicioFilter: `${year}-01-01`,
      dataFimFilter: `${year}-12-31`,
    });
  }
}
