import { Expose, Transform } from 'class-transformer';
import { Atividade } from '@e-fatura/models/atividade.enum';
import { decode } from 'he';

export class Linha {
  @Expose()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return decode(value);
  })
  nomeEmitente: string;

  @Expose()
  idDocumento: string;

  @Expose()
  dataEmissaoDocumento: string;

  @Expose()
  nifEmitente: number;

  @Expose()
  actividadeEmitente: Atividade;
}
