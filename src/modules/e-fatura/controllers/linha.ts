import { Expose } from 'class-transformer';

export class Linha {
  @Expose()
  nomeEmitente: string;

  @Expose()
  idDocumento: string;

  @Expose()
  dataEmissaoDocumento: string;
}
