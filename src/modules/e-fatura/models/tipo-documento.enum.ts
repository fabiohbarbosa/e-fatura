export enum TipoDocumento {
  NOTA_CREDITO = 'NC',
  NOTA_DEBITO = 'ND',
  FATURA = 'FT',
  FATURA_SIMPLIFICADA = 'FS',
  FATURA_RECIBO = 'FR',
}

export class TipoDocumentoHelper {
  static values(): TipoDocumento[] {
    return Object.values(TipoDocumento);
  }
}
