'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useEvergreen } from '@gitroom/frontend/components/masssocial/hooks';
import { EvergreenPost } from '@gitroom/frontend/components/masssocial/types';
import {
  ChannelAvatar,
  EmptyState,
  formatLocalDate,
  LoadingState,
  stripHtml,
} from '@gitroom/frontend/components/masssocial/shared';

const EvergreenRow: FC<{
  post: EvergreenPost;
  onChange: (intervalInDays: number | null) => Promise<void>;
}> = ({ post, onChange }) => {
  const t = useT();
  const [value, setValue] = useState(String(post.intervalInDays));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(String(post.intervalInDays));
  }, [post.intervalInDays]);

  const save = useCallback(async () => {
    const parsed = Number(value);
    if (!parsed || parsed < 1 || parsed === post.intervalInDays) {
      setValue(String(post.intervalInDays));
      return;
    }
    setSaving(true);
    try {
      await onChange(parsed);
    } finally {
      setSaving(false);
    }
  }, [value, post.intervalInDays, onChange]);

  const remove = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'masssocial_evergreen_remove_confirm',
          'La publicación dejará de repetirse. ¿Continuar?'
        ),
        t('masssocial_evergreen_remove', 'Quitar de perennes')
      ))
    ) {
      return;
    }
    setSaving(true);
    try {
      await onChange(null);
    } finally {
      setSaving(false);
    }
  }, [onChange, t]);

  const content = stripHtml(post.content);

  return (
    <div className="grid grid-cols-[200px_minmax(200px,1fr)_140px_100px_170px_150px] gap-[8px] items-center px-[12px] py-[10px] border-b border-newTableBorder hover:bg-boxHover text-[13px]">
      <div className="flex items-center gap-[8px] min-w-0">
        <ChannelAvatar channel={post.integration} size={28} />
        <span className="truncate">{post.integration?.name}</span>
      </div>
      <div className="truncate" title={content}>
        {content}
      </div>
      <div>{formatLocalDate(post.publishDate)}</div>
      <div className="text-textItemBlur">{post.state}</div>
      <div className="flex items-center gap-[6px]">
        <span className="text-textItemBlur text-[12px]">
          {t('masssocial_every', 'cada')}
        </span>
        <input
          type="number"
          min={1}
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-[64px] h-[34px] bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[8px] outline-none text-[13px]"
        />
        <span className="text-textItemBlur text-[12px]">
          {t('masssocial_days', 'días')}
        </span>
      </div>
      <div>
        <Button
          secondary={true}
          className="!h-[32px] !px-[12px] text-[12px]"
          loading={saving}
          onClick={remove}
        >
          {t('masssocial_evergreen_remove', 'Quitar de perennes')}
        </Button>
      </div>
    </div>
  );
};

export const EvergreenComponent: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, isLoading, mutate } = useEvergreen();

  const update = useCallback(
    (post: EvergreenPost) => async (intervalInDays: number | null) => {
      try {
        const response = await fetch(`/masssocial/evergreen/${post.id}`, {
          method: 'PUT',
          body: JSON.stringify({ intervalInDays }),
        });
        if (!response.ok) {
          throw new Error();
        }
        toaster.show(
          intervalInDays
            ? t('masssocial_evergreen_updated', 'Intervalo actualizado')
            : t('masssocial_evergreen_removed', 'Publicación quitada de perennes'),
          'success'
        );
        mutate();
      } catch {
        toaster.show(
          t('masssocial_evergreen_failed', 'No se pudo actualizar la publicación'),
          'warning'
        );
      }
    },
    [fetch, mutate, toaster, t]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="text-[13px] text-textItemBlur">
        {t(
          'masssocial_evergreen_help',
          'Publicaciones que se vuelven a programar automáticamente cada N días.'
        )}
      </div>
      <div className="overflow-x-auto rounded-[8px] border border-newTableBorder">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[200px_minmax(200px,1fr)_140px_100px_170px_150px] gap-[8px] px-[12px] py-[10px] bg-newTableHeader text-newTableText text-[12px] font-[500]">
            <div>{t('masssocial_col_channel', 'Canal')}</div>
            <div>{t('masssocial_col_text', 'Texto')}</div>
            <div>{t('masssocial_col_next', 'Próxima')}</div>
            <div>{t('masssocial_col_state', 'Estado')}</div>
            <div>{t('masssocial_col_interval', 'Intervalo')}</div>
            <div />
          </div>
          {!data?.posts?.length && (
            <EmptyState
              text={t('masssocial_evergreen_empty', 'No hay publicaciones perennes')}
            />
          )}
          {data?.posts?.map((post) => (
            <EvergreenRow key={post.id} post={post} onChange={update(post)} />
          ))}
        </div>
      </div>
    </div>
  );
};
