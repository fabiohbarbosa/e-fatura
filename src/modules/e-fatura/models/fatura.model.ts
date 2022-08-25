import { Expose, Transform } from 'class-transformer';
import { Atividade } from '@e-fatura/models/atividade.enum';
import { decode } from 'he';
import { TipoDocumento } from '@e-fatura/models/tipo-documento.enum';

export class Fatura {
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

  @Expose()
  @Transform(({ value, obj }) => {
    if (!value) return undefined;
    const toString = value.toString();
    const totalLength = toString.length;

    const integer = toString.toString().slice(0, totalLength - 2);
    const decimal = toString.toString().slice(totalLength - 2);

    const total = Number(`${integer}.${decimal}`);

    switch (obj.tipoDocumento) {
      case TipoDocumento.NOTA_CREDITO:
        return total * -1;
      case TipoDocumento.NOTA_DEBITO:
      case TipoDocumento.FATURA:
      case TipoDocumento.FATURA_SIMPLIFICADA:
      case TipoDocumento.FATURA_RECIBO:
        return total;
      default:
        throw new Error(`Cannot resolve type=${obj.tipoDocumento}`);
    }
  })
  valorTotal: number;
}
