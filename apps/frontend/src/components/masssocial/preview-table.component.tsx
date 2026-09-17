'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  BulkRowInput,
  BulkRowPreview,
  CommitResponse,
} from '@gitroom/frontend/components/masssocial/types';
import {
  ChannelAvatar,
  formatLocalDate,
  stripHtml,
} from '@gitroom/frontend/components/masssocial/shared';
import { AdaptModal } from '@gitroom/frontend/components/masssocial/adapt.modal';

const GRID =
  'grid grid-cols-[48px_130px_120px_170px_minmax(220px,1fr)_110px_140px_120px] gap-[8px] items-start';

const TEXT_LIMIT = 140;

const rowStatus = (row: BulkRowPreview) =>
  row.errors?.length ? 'error' : row.warnings?.length ? 'warning' : 'ok';

// Convierte la fila previsualizada en la fila de entrada para volver a previsualizar
export const toInputRow = (
  row: BulkRowPreview,
  texto: string
): BulkRowInput => ({
  ...(row.raw as unknown as Partial<BulkRowInput>),
  index: row.index,
  texto,
});

const PreviewRow: FC<{
  row: BulkRowPreview;
  onChange: (row: BulkRowPreview) => void;
  onRemove: () => void;
  onEditText: (text: string) => Promise<void>;
}> = ({ row, onChange, onRemove, onEditText }) => {
  const t = useT();
  const { openModal } = useModals();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const text = useMemo(
    () => row.raw?.texto || stripHtml(row.targets[0]?.content || ''),
    [row]
  );
  const status = rowStatus(row);

  const startEdit = useCallback(() => {
    setDraft(text);
    setEditing(true);
  }, [text]);

  const saveEdit = useCallback(async () => {
    setSaving(true);
    try {
      await onEditText(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, onEditText]);

  const openAdapt = useCallback(() => {
    openModal({
      title: t('masssocial_adapt_by_network', 'Adaptar por red'),
      closeOnEscape: true,
      children: (close) => (
        <AdaptModal row={row} onApply={onChange} close={close} />
      ),
    });
  }, [row, onChange, openModal, t]);

  return (
    <div
      className={clsx(
        GRID,
        'px-[12px] py-[10px] border-b border-newTableBorder hover:bg-boxHover text-[13px]'
      )}
    >
      <div className="text-textItemBlur">{row.index}</div>
      <div className="flex flex-col gap-[2px]">
        <span>{formatLocalDate(row.date)}</span>
        {row.draft && (
          <span className="text-[11px] text-textItemBlur">
            {t('masssocial_draft', 'Borrador')}
          </span>
        )}
        {!!row.inter && (
          <span className="text-[11px] text-textItemBlur">
            {t('masssocial_every_n_days', 'cada {{n}} días', { n: row.inter })}
          </span>
        )}
      </div>
      <div className="truncate" title={row.project?.name}>
        {row.project?.name || <span className="text-textItemBlur">—</span>}
      </div>
      <div className="flex flex-col gap-[4px]">
        {row.targets.map((target) => (
          <div
            key={target.integrationId}
            className="flex items-center gap-[6px] min-w-0"
          >
            <ChannelAvatar channel={target} size={22} />
            <span className="truncate">{target.name}</span>
            {target.truncated && (
              <span
                className="px-[4px] rounded-[4px] bg-yellow-500/20 text-yellow-400 text-[10px] shrink-0"
                title={t(
                  'masssocial_truncated_hint',
                  'El texto se recortó al límite de la red'
                )}
              >
                {t('masssocial_truncated', 'recortado')}
              </span>
            )}
          </div>
        ))}
        {!row.targets.length && <span className="text-textItemBlur">—</span>}
      </div>
      <div className="min-w-0 flex flex-col gap-[6px]">
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="bg-newBgColorInner border border-newTableBorder rounded-[8px] p-[8px] min-h-[100px] outline-none text-[13px] w-full"
            />
            <div className="flex gap-[6px]">
              <Button className="!h-[30px] !px-[12px] text-[12px]" loading={saving} onClick={saveEdit}>
                {t('save', 'Save')}
              </Button>
              <Button
                secondary={true}
                className="!h-[30px] !px-[12px] text-[12px]"
                onClick={() => setEditing(false)}
              >
                {t('cancel', 'Cancel')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="whitespace-pre-wrap break-words">
              {expanded || text.length <= TEXT_LIMIT
                ? text
                : `${text.slice(0, TEXT_LIMIT)}…`}
            </div>
            <div className="flex gap-[10px] text-[12px] text-textItemBlur">
              {text.length > TEXT_LIMIT && (
                <span
                  className="cursor-pointer hover:underline"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded
                    ? t('masssocial_show_less', 'Ver menos')
                    : t('masssocial_show_more', 'Ver más')}
                </span>
              )}
              <span className="cursor-pointer hover:underline" onClick={startEdit}>
                {t('edit', 'Edit')}
              </span>
              {!!row.targets.length && (
                <span className="cursor-pointer hover:underline" onClick={openAdapt}>
                  {t('masssocial_adapt_by_network', 'Adaptar por red')}
                </span>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-[4px]">
        {row.media.map((media) => (
          <img
            key={media.id}
            src={media.thumbnail || media.path}
            alt={media.name}
            title={media.name}
            className="w-[32px] h-[32px] rounded-[4px] object-cover bg-newTableHeader"
          />
        ))}
        {!row.media.length && <span className="text-textItemBlur">—</span>}
      </div>
      <div className="flex flex-col gap-[4px] min-w-0">
        <span
          className={clsx(
            'px-[6px] py-[2px] rounded-[4px] text-[11px] w-fit',
            status === 'ok' && 'bg-green-500/20 text-green-400',
            status === 'warning' && 'bg-yellow-500/20 text-yellow-400',
            status === 'error' && 'bg-red-500/20 text-red-400'
          )}
        >
          {status === 'ok'
            ? t('masssocial_status_ok', 'OK')
            : status === 'warning'
            ? t('masssocial_status_warning', 'Avisos')
            : t('masssocial_status_error', 'Errores')}
        </span>
        {row.errors?.map((message, i) => (
          <div key={`e${i}`} className="text-[11px] text-red-400 break-words">
            {message}
          </div>
        ))}
        {row.warnings?.map((message, i) => (
          <div key={`w${i}`} className="text-[11px] text-yellow-400 break-words">
            {message}
          </div>
        ))}
      </div>
      <div className="text-[12px] text-textItemBlur">
        <span className="cursor-pointer hover:underline" onClick={onRemove}>
          {t('masssocial_remove_row', 'Quitar')}
        </span>
      </div>
    </div>
  );
};

export const PreviewTable: FC<{
  rows: BulkRowPreview[];
  onRowsChange: (rows: BulkRowPreview[]) => void;
}> = ({ rows, onRowsChange }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitResponse | null>(null);

  const summary = useMemo(() => {
    const errors = rows.filter((r) => rowStatus(r) === 'error').length;
    const warnings = rows.filter((r) => rowStatus(r) === 'warning').length;
    return {
      total: rows.length,
      errors,
      warnings,
      valid: rows.length - errors,
    };
  }, [rows]);

  const replaceRow = useCallback(
    (index: number, row: BulkRowPreview) => {
      onRowsChange(rows.map((r) => (r.index === index ? row : r)));
    },
    [rows, onRowsChange]
  );

  const removeRow = useCallback(
    (index: number) => () => {
      onRowsChange(rows.filter((r) => r.index !== index));
    },
    [rows, onRowsChange]
  );

  const editText = useCallback(
    (row: BulkRowPreview) => async (texto: string) => {
      try {
        const response = await fetch('/masssocial/bulk/preview', {
          method: 'POST',
          body: JSON.stringify({ rows: [toInputRow(row, texto)] }),
        });
        if (!response.ok) {
          throw new Error();
        }
        const data: { rows: BulkRowPreview[] } = await response.json();
        const updated = data.rows?.[0];
        if (!updated) {
          throw new Error();
        }
        replaceRow(row.index, { ...updated, index: row.index });
      } catch {
        toaster.show(
          t('masssocial_preview_failed', 'No se pudo actualizar la vista previa'),
          'warning'
        );
        throw new Error('preview failed');
      }
    },
    [replaceRow, fetch, toaster, t]
  );

  const commit = useCallback(async () => {
    const valid = rows.filter((r) => rowStatus(r) !== 'error');
    if (!valid.length) {
      return;
    }
    setCommitting(true);
    try {
      const response = await fetch('/masssocial/bulk/commit', {
        method: 'POST',
        body: JSON.stringify({ rows: valid }),
      });
      if (!response.ok) {
        throw new Error();
      }
      const data: CommitResponse = await response.json();
      setResult(data);
      const createdIndexes = new Set((data.created || []).map((c) => c.index));
      onRowsChange(rows.filter((r) => !createdIndexes.has(r.index)));
      toaster.show(
        t('masssocial_commit_done', '{{n}} publicaciones programadas', {
          n: createdIndexes.size,
        }),
        'success'
      );
    } catch {
      toaster.show(
        t('masssocial_commit_failed', 'No se pudieron programar las publicaciones'),
        'warning'
      );
    } finally {
      setCommitting(false);
    }
  }, [rows, fetch, onRowsChange, toaster, t]);

  return (
    <div className="flex flex-col gap-[12px]">
      {result && (
        <div className="border border-newTableBorder rounded-[8px] p-[12px] flex flex-col gap-[6px] text-[13px]">
          <div className="flex items-center gap-[12px]">
            <span className="text-green-400">
              {t('masssocial_result_created', 'Creadas: {{n}}', {
                n: result.created?.length || 0,
              })}
            </span>
            <span className={clsx(result.failed?.length ? 'text-red-400' : 'text-textItemBlur')}>
              {t('masssocial_result_failed', 'Fallidas: {{n}}', {
                n: result.failed?.length || 0,
              })}
            </span>
            <div className="flex-1" />
            <Link href="/launches" className="underline text-newTableText">
              {t('masssocial_go_to_calendar', 'Ver en el calendario')}
            </Link>
          </div>
          {result.failed?.map((failure) => (
            <div key={failure.index} className="text-[12px] text-red-400">
              #{failure.index}: {failure.error}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-[12px] text-[13px] flex-wrap">
        <span>
          {t('masssocial_summary_total', 'Total: {{n}}', { n: summary.total })}
        </span>
        <span className="text-green-400">
          {t('masssocial_summary_valid', 'Válidas: {{n}}', { n: summary.valid })}
        </span>
        <span className="text-yellow-400">
          {t('masssocial_summary_warnings', 'Con avisos: {{n}}', {
            n: summary.warnings,
          })}
        </span>
        <span className="text-red-400">
          {t('masssocial_summary_errors', 'Con errores: {{n}}', {
            n: summary.errors,
          })}
        </span>
        <div className="flex-1" />
        <Button
          loading={committing}
          disabled={!summary.valid}
          onClick={commit}
        >
          {t('masssocial_schedule_n', 'Programar {{n}} publicaciones', {
            n: summary.valid,
          })}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[8px] border border-newTableBorder">
        <div className="min-w-[1100px]">
          <div
            className={clsx(
              GRID,
              'px-[12px] py-[10px] bg-newTableHeader text-newTableText text-[12px] font-[500]'
            )}
          >
            <div>#</div>
            <div>{t('masssocial_col_date', 'Fecha / hora')}</div>
            <div>{t('masssocial_col_project', 'Proyecto')}</div>
            <div>{t('masssocial_col_channels', 'Canales')}</div>
            <div>{t('masssocial_col_text', 'Texto')}</div>
            <div>{t('masssocial_col_media', 'Medios')}</div>
            <div>{t('masssocial_col_status', 'Estado')}</div>
            <div />
          </div>
          {!rows.length && (
            <div className="py-[24px] text-center text-textItemBlur text-[13px]">
              {t('masssocial_no_rows', 'No hay filas')}
            </div>
          )}
          {rows.map((row) => (
            <PreviewRow
              key={row.index}
              row={row}
              onChange={(updated) => replaceRow(row.index, updated)}
              onRemove={removeRow(row.index)}
              onEditText={editText(row)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
