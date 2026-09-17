'use client';

import { FC, useCallback, useRef, useState, DragEvent } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  BulkRowInput,
  BulkRowPreview,
} from '@gitroom/frontend/components/masssocial/types';
import { SectionBox } from '@gitroom/frontend/components/masssocial/shared';
import { PreviewTable } from '@gitroom/frontend/components/masssocial/preview-table.component';

export const BulkImportComponent: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<BulkRowPreview[] | null>(null);

  const pickFile = useCallback((list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) {
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(picked.name)) {
      toaster.show(
        t('masssocial_invalid_file', 'Solo se admiten archivos .csv o .xlsx'),
        'warning'
      );
      return;
    }
    setFile(picked);
    setRows(null);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      pickFile(e.dataTransfer.files);
    },
    [pickFile]
  );

  const downloadTemplate = useCallback(async () => {
    setDownloading(true);
    try {
      const response = await fetch('/masssocial/bulk/template');
      if (!response.ok) {
        throw new Error();
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-masssocial.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toaster.show(
        t('masssocial_template_failed', 'No se pudo descargar la plantilla'),
        'warning'
      );
    } finally {
      setDownloading(false);
    }
  }, [fetch, toaster, t]);

  const analyze = useCallback(async () => {
    if (!file) {
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const parsed = await fetch('/masssocial/bulk/parse', {
        method: 'POST',
        body: form,
      });
      if (!parsed.ok) {
        throw new Error('parse');
      }
      const { rows: inputRows, columns: parsedColumns } = (await parsed.json()) as {
        rows: BulkRowInput[];
        columns: string[];
      };
      setColumns(parsedColumns || []);
      if (!inputRows?.length) {
        toaster.show(
          t('masssocial_no_rows_in_file', 'El archivo no contiene filas'),
          'warning'
        );
        return;
      }
      const preview = await fetch('/masssocial/bulk/preview', {
        method: 'POST',
        body: JSON.stringify({ rows: inputRows }),
      });
      if (!preview.ok) {
        throw new Error('preview');
      }
      const { rows: previewRows } = (await preview.json()) as {
        rows: BulkRowPreview[];
      };
      setRows(previewRows || []);
    } catch {
      toaster.show(
        t('masssocial_parse_failed', 'No se pudo procesar el archivo'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [file, fetch, toaster, t]);

  const reset = useCallback(() => {
    setFile(null);
    setRows(null);
    setColumns([]);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  return (
    <div className="flex flex-col gap-[16px]">
      <SectionBox
        title={t('masssocial_import_title', 'Importar CSV/Excel')}
        actions={
          <Button secondary={true} loading={downloading} onClick={downloadTemplate}>
            {t('masssocial_download_template', 'Descargar plantilla')}
          </Button>
        }
      >
        <div className="text-[13px] text-textItemBlur">
          {t(
            'masssocial_import_help',
            'Columnas: fecha, hora, zona_horaria, proyecto, redes, texto, medios, titulo, tipo, tablero, repetir_dias, etiquetas, borrador, adaptar.'
          )}
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'border border-dashed rounded-[8px] p-[32px] text-center cursor-pointer transition-all text-[14px]',
            dragging
              ? 'border-btnPrimary bg-boxHover'
              : 'border-newTableBorder hover:bg-boxHover'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => pickFile(e.target.files)}
          />
          {file ? (
            <div className="flex flex-col gap-[4px]">
              <div>{file.name}</div>
              <div className="text-[12px] text-textItemBlur">
                {Math.round(file.size / 1024)} KB
              </div>
            </div>
          ) : (
            <div className="text-textItemBlur">
              {t(
                'masssocial_drop_file',
                'Arrastra aquí un archivo .csv o .xlsx, o haz clic para elegirlo'
              )}
            </div>
          )}
        </div>
        <div className="flex gap-[8px]">
          <Button disabled={!file} loading={loading} onClick={analyze}>
            {t('masssocial_analyze', 'Analizar y previsualizar')}
          </Button>
          {(file || rows) && (
            <Button secondary={true} onClick={reset}>
              {t('masssocial_start_over', 'Empezar de nuevo')}
            </Button>
          )}
        </div>
        {!!columns.length && (
          <div className="text-[12px] text-textItemBlur">
            {t('masssocial_detected_columns', 'Columnas detectadas')}:{' '}
            {columns.join(', ')}
          </div>
        )}
      </SectionBox>

      {rows && <PreviewTable rows={rows} onRowsChange={setRows} />}
    </div>
  );
};
