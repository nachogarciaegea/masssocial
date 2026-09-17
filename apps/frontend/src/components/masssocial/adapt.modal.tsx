'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { Textarea } from '@gitroom/react/form/textarea';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Adaptation,
  AdaptResponse,
  BulkRowPreview,
  BulkTarget,
} from '@gitroom/frontend/components/masssocial/types';
import {
  ChannelAvatar,
  stripHtml,
} from '@gitroom/frontend/components/masssocial/shared';

// Aplica las adaptaciones devueltas por /masssocial/adapt a los targets de una fila
export const applyAdaptations = (
  row: BulkRowPreview,
  content: string,
  adaptations: Adaptation[]
): BulkRowPreview => {
  const targets: BulkTarget[] = row.targets.map((target) => {
    const adaptation = adaptations.find(
      (a) => a.integrationId === target.integrationId
    );
    if (!adaptation) {
      return target;
    }
    return {
      ...target,
      content: adaptation.content,
      maxLength: adaptation.maxLength,
      truncated: adaptation.truncated,
    };
  });
  return {
    ...row,
    targets,
    raw: { ...row.raw, texto: content },
  };
};

export const AdaptModal: FC<{
  row: BulkRowPreview;
  onApply: (row: BulkRowPreview) => void;
  close: () => void;
}> = ({ row, onApply, close }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [content, setContent] = useState(
    row.raw?.texto || stripHtml(row.targets[0]?.content || '')
  );
  const [useAi, setUseAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adaptations, setAdaptations] = useState<Adaptation[] | null>(null);

  const adapt = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/masssocial/adapt', {
        method: 'POST',
        body: JSON.stringify({
          content,
          integrationIds: row.targets.map((p) => p.integrationId),
          projectId: row.project?.id,
          useAi,
        }),
      });
      if (!response.ok) {
        throw new Error();
      }
      const data: AdaptResponse = await response.json();
      setAdaptations(data.adaptations || []);
    } catch {
      toaster.show(
        t('masssocial_adapt_failed', 'No se pudo adaptar el texto'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [content, useAi, row]);

  const apply = useCallback(() => {
    if (!adaptations) {
      return;
    }
    onApply(applyAdaptations(row, content, adaptations));
    close();
  }, [adaptations, content, row, onApply, close]);

  return (
    <div className="flex flex-col gap-[16px] min-w-[320px] md:min-w-[640px]">
      <Textarea
        disableForm={true}
        label={t('masssocial_original_text', 'Texto original')}
        name="content"
        value={content}
        onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
      />
      <div className="flex items-center gap-[16px]">
        <Checkbox
          disableForm={true}
          checked={useAi}
          onChange={() => setUseAi(!useAi)}
          label={t(
            'masssocial_use_ai',
            'Reescribir con IA según el tono del proyecto'
          )}
        />
        <div className="flex-1" />
        <Button secondary={true} loading={loading} onClick={adapt}>
          {t('masssocial_adapt_action', 'Adaptar')}
        </Button>
      </div>

      {adaptations && (
        <div className="flex flex-col gap-[8px]">
          {!adaptations.length && (
            <div className="text-textItemBlur text-[13px]">
              {t('masssocial_no_adaptations', 'Sin resultados')}
            </div>
          )}
          {adaptations.map((adaptation) => {
            const target = row.targets.find(
              (p) => p.integrationId === adaptation.integrationId
            );
            const plain = stripHtml(adaptation.content);
            return (
              <div
                key={adaptation.integrationId}
                className="border border-newTableBorder rounded-[8px] p-[12px] flex gap-[12px]"
              >
                {target && <ChannelAvatar channel={target} size={32} />}
                <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
                  <div className="flex items-center gap-[8px] text-[13px]">
                    <span className="font-[500]">
                      {target?.name || adaptation.identifier}
                    </span>
                    <span className="text-textItemBlur">
                      {plain.length}/{adaptation.maxLength}
                    </span>
                    {adaptation.truncated && (
                      <span className="px-[6px] rounded-[4px] bg-yellow-500/20 text-yellow-400 text-[11px]">
                        {t('masssocial_truncated', 'recortado')}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] whitespace-pre-wrap break-words text-newTableText">
                    {plain}
                  </div>
                  {!!adaptation.notes?.length && (
                    <ul className="text-[11px] text-textItemBlur list-disc ps-[16px]">
                      {adaptation.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={clsx('flex justify-end gap-[8px]')}>
        <Button secondary={true} onClick={close}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button disabled={!adaptations?.length} onClick={apply}>
          {t('masssocial_apply_to_row', 'Aplicar a la fila')}
        </Button>
      </div>
    </div>
  );
};
