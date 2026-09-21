'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Textarea } from '@gitroom/react/form/textarea';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';

// Texto plano (párrafos separados por línea en blanco) -> HTML <p>...</p>,
// igual que el editor lo espera y que AdaptService.toHtml en el backend.
function plainToHtml(text: string) {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => !!p)
    .map((p) => `<p>${escape(p)}</p>`)
    .join('');
}

const useAiStatus = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/masssocial/adapt/ai-status')).json();
  }, []);
  return useSWR<{ available: boolean; provider: string | null }>(
    'masssocial-ai-status',
    load,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
};

const AiDraftModal: FC<{
  integrationIds: string[];
  onInsert: (html: string) => void;
  close: () => void;
}> = ({ integrationIds, onInsert, close }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [instruction, setInstruction] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!instruction.trim()) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/masssocial/adapt/draft', {
        method: 'POST',
        body: JSON.stringify({
          instruction,
          integrationIds,
        }),
      });
      if (!response.ok) {
        throw new Error();
      }
      const data: { draft: string } = await response.json();
      setDraft(data.draft || '');
    } catch {
      toaster.show(
        t('masssocial_ai_draft_failed', 'La IA local no ha podido redactar el texto'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [instruction, integrationIds]);

  const insert = useCallback(() => {
    onInsert(plainToHtml(draft));
    close();
  }, [draft, onInsert, close]);

  return (
    <div className="flex flex-col gap-[16px] min-w-[320px] md:min-w-[560px]">
      <Textarea
        disableForm={true}
        label={t(
          'masssocial_ai_draft_instruction',
          'Sobre qué quieres publicar'
        )}
        name="instruction"
        placeholder={t(
          'masssocial_ai_draft_instruction_placeholder',
          'Ej: promociona el nuevo mural en el centro de Melilla, tono cercano'
        )}
        value={instruction}
        onChange={(e) =>
          setInstruction((e.target as HTMLTextAreaElement).value)
        }
      />
      <div className="flex justify-end">
        <Button
          secondary={true}
          loading={loading}
          disabled={!instruction.trim()}
          onClick={generate}
        >
          {t('masssocial_ai_draft_generate', 'Redactar con IA local')}
        </Button>
      </div>

      {!!draft && (
        <div className="border border-newTableBorder rounded-[8px] p-[12px] text-[13px] whitespace-pre-wrap break-words text-newTableText">
          {draft}
        </div>
      )}

      <div className="flex justify-end gap-[8px]">
        <Button secondary={true} onClick={close}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button disabled={!draft} onClick={insert}>
          {t('masssocial_ai_draft_insert', 'Usar este texto')}
        </Button>
      </div>
    </div>
  );
};

// Botón "Redactar con IA local", visible solo si hay IA local configurada
// en el servidor (Ollama), sin depender de ninguna clave de pago.
export const AiDraftButton: FC<{
  integrationIds: string[];
  onInsert: (html: string) => void;
}> = ({ integrationIds, onInsert }) => {
  const t = useT();
  const modals = useModals();
  const { data } = useAiStatus();

  const open = useCallback(() => {
    modals.openModal({
      title: t('masssocial_ai_draft_title', 'Redactar con IA local'),
      children: (close) => (
        <AiDraftModal
          integrationIds={integrationIds}
          onInsert={onInsert}
          close={close}
        />
      ),
    });
  }, [integrationIds, onInsert]);

  if (!data?.available) {
    return null;
  }

  return (
    <div
      onClick={open}
      className="cursor-pointer flex items-center gap-[6px] text-[13px] text-textItemBlur hover:text-textItemFocused"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"
          fill="currentColor"
        />
        <path
          d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"
          fill="currentColor"
        />
      </svg>
      {t('masssocial_ai_draft_button', 'Redactar con IA local')}
    </div>
  );
};
