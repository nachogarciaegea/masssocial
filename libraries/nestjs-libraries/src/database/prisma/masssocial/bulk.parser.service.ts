import { BadRequestException, Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { BulkRowInputDto } from '@gitroom/nestjs-libraries/dtos/masssocial/bulk.dto';

export const BULK_COLUMNS = [
  'fecha',
  'hora',
  'zona_horaria',
  'proyecto',
  'redes',
  'texto',
  'medios',
  'titulo',
  'tipo',
  'tablero',
  'repetir_dias',
  'etiquetas',
  'borrador',
  'adaptar',
] as const;

export type BulkColumn = (typeof BULK_COLUMNS)[number];

const HEADER_ALIASES: Record<string, BulkColumn> = {
  fecha: 'fecha',
  date: 'fecha',
  hora: 'hora',
  time: 'hora',
  zona_horaria: 'zona_horaria',
  zonahoraria: 'zona_horaria',
  timezone: 'zona_horaria',
  proyecto: 'proyecto',
  project: 'proyecto',
  cliente: 'proyecto',
  redes: 'redes',
  red: 'redes',
  channels: 'redes',
  channel: 'redes',
  networks: 'redes',
  network: 'redes',
  canales: 'redes',
  texto: 'texto',
  text: 'texto',
  content: 'texto',
  contenido: 'texto',
  medios: 'medios',
  media: 'medios',
  files: 'medios',
  archivos: 'medios',
  titulo: 'titulo',
  title: 'titulo',
  tipo: 'tipo',
  type: 'tipo',
  tablero: 'tablero',
  board: 'tablero',
  repetir_dias: 'repetir_dias',
  repetirdias: 'repetir_dias',
  repeat_days: 'repetir_dias',
  repeatdays: 'repetir_dias',
  etiquetas: 'etiquetas',
  tags: 'etiquetas',
  borrador: 'borrador',
  draft: 'borrador',
  adaptar: 'adaptar',
  adapt: 'adaptar',
};

const MAX_ROWS = 2000;

@Injectable()
export class BulkParserService {
  normalizeHeader(header: string): string {
    return (header || '')
      .replace(/^\uFEFF/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, '_');
  }

  mapHeader(header: string): BulkColumn | undefined {
    const normalized = this.normalizeHeader(header);
    return (
      HEADER_ALIASES[normalized] ||
      HEADER_ALIASES[normalized.replace(/_/g, '')]
    );
  }

  async parse(
    buffer: Buffer,
    fileName: string
  ): Promise<{ rows: BulkRowInputDto[]; columns: string[] }> {
    const lower = (fileName || '').toLowerCase();
    const table = lower.endsWith('.xlsx')
      ? await this.parseXlsx(buffer)
      : lower.endsWith('.csv') || lower.endsWith('.txt')
      ? this.parseCsv(buffer.toString('utf-8'))
      : undefined;

    if (!table) {
      throw new BadRequestException(
        'Formato no soportado: sube un archivo .csv o .xlsx'
      );
    }

    return this.tableToRows(table);
  }

  tableToRows(table: string[][]): {
    rows: BulkRowInputDto[];
    columns: string[];
  } {
    const [header, ...body] = table;
    if (!header || !header.length) {
      throw new BadRequestException('El archivo está vacío');
    }

    const mapping = header.map((h) => this.mapHeader(h));
    const columns = mapping.filter((m): m is BulkColumn => !!m);
    if (!columns.length) {
      throw new BadRequestException(
        'No se ha reconocido ninguna cabecera. Cabeceras aceptadas: ' +
          BULK_COLUMNS.join(', ')
      );
    }

    const rows: BulkRowInputDto[] = [];
    let index = 0;
    for (const line of body) {
      if (line.every((cell) => !String(cell ?? '').trim())) {
        continue;
      }
      index++;
      if (index > MAX_ROWS) {
        throw new BadRequestException(
          `Demasiadas filas: el máximo es ${MAX_ROWS}`
        );
      }
      const row: BulkRowInputDto = { index };
      mapping.forEach((column, i) => {
        if (!column) {
          return;
        }
        const value = String(line[i] ?? '').trim();
        if (value) {
          row[column] = value;
        }
      });
      rows.push(row);
    }

    return { rows, columns: Array.from(new Set(columns)) };
  }

  detectSeparator(text: string): ',' | ';' {
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    let commas = 0;
    let semicolons = 0;
    let inQuotes = false;
    for (const char of firstLine) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes && char === ',') {
        commas++;
      } else if (!inQuotes && char === ';') {
        semicolons++;
      }
    }
    return semicolons > commas ? ';' : ',';
  }

  // RFC 4180: campos entre comillas, comillas escapadas ("") y CRLF
  parseCsv(input: string): string[][] {
    const text = input.replace(/^\uFEFF/, '');
    const separator = this.detectSeparator(text);
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === separator) {
        row.push(field);
        field = '';
      } else if (char === '\r') {
        // CRLF: la LF siguiente cierra la fila
        if (text[i + 1] !== '\n') {
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
        }
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  async parseXlsx(buffer: Buffer): Promise<string[][]> {
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('El archivo .xlsx no tiene hojas');
    }

    const table: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      const cells = row.values as any[];
      for (let i = 1; i < cells.length; i++) {
        values.push(this.cellToString(cells[i]));
      }
      table.push(values);
    });
    return table;
  }

  private cellToString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof Date) {
      // exceljs devuelve fechas en UTC; se conserva la parte de fecha/hora tal cual
      const iso = value.toISOString();
      const date = iso.slice(0, 10);
      const time = iso.slice(11, 16);
      // Celdas "solo hora" de Excel: exceljs las sitúa en la época 1899-12-30 (o 1904-01-01)
      if (date === '1899-12-30' || date === '1904-01-01') {
        return time;
      }
      return time === '00:00' ? date : `${date} ${time}`;
    }
    if (typeof value === 'object') {
      if (Array.isArray(value.richText)) {
        return value.richText.map((r: any) => r.text).join('');
      }
      if (value.text !== undefined) {
        return String(value.text);
      }
      if (value.result !== undefined) {
        return this.cellToString(value.result);
      }
      if (value.hyperlink) {
        return String(value.hyperlink);
      }
    }
    return String(value);
  }

  template(): string {
    const header = BULK_COLUMNS.join(',');
    const rows = [
      [
        '2026-10-01',
        '19:00',
        'Europe/Madrid',
        'Mi proyecto',
        'instagram|x',
        'Primer párrafo del post.\nSegundo párrafo con más detalle.',
        'foto1.jpg',
        '',
        'post',
        '',
        '',
        'lanzamiento|otoño',
        'no',
        'si',
      ],
      [
        '2026-10-02',
        '12:30',
        'Europe/Madrid',
        'Mi proyecto',
        'youtube',
        'Descripción del vídeo, con "comillas" y todo.',
        'https://example.com/video.mp4',
        'Título del vídeo',
        '',
        '',
        '7',
        '',
        'si',
        'si',
      ],
    ];

    const escape = (value: string) =>
      /[",;\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

    return (
      '\uFEFF' +
      [header, ...rows.map((r) => r.map(escape).join(','))].join('\r\n') +
      '\r\n'
    );
  }
}
