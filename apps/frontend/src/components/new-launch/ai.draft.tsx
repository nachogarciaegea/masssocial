'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';

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

// Barra "Escribir con IA" encima del editor: se escribe la instrucción, Enter,
// y el texto va directo al editor. Si ya hay texto, se manda como contexto
// para poder pedir "hazlo más corto", "cambia el gancho", etc.
// El texto anterior para "Deshacer" lo guarda el editor padre: insertar
// remonta el editor (y esta barra con él), así que aquí se perdería.
export const AiPromptBar: FC<{
  integrationIds: string[];
  currentValue: string;
  canUndo: boolean;
  onInsert: (html: string) => void;
  onUndo: () => void;
}> = ({ integrationIds, currentValue, canUndo, onInsert, onUndo }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data } = useAiStatus();
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!instruction.trim() || loading) {
      return;
    }
    setLoading(true);
    try {
      const currentText = stripHtmlValidation('normal', currentValue || '', true);
      const response = await fetch('/masssocial/adapt/draft', {
        method: 'POST',
        body: JSON.stringify({
          instruction,
          integrationIds,
          currentText: currentText.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error();
      }
      const result: { draft: string } = await response.json();
      if (!result.draft) {
        throw new Error();
      }
      onInsert(plainToHtml(result.draft));
    } catch {
      toaster.show(
        t('masssocial_ai_draft_failed', 'La IA no ha podido redactar el texto'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [instruction, loading, integrationIds, currentValue, onInsert]);

  if (!data?.available) {
    return null;
  }

  return (
    <div className="flex gap-[8px] items-center bg-newSettings rounded-[12px] p-[8px]">
      <div className="ps-[4px] text-[#D82D7E]">
        <svg
          width="18"
          height="18"
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
      </div>
      <input
        value={instruction}
        disabled={loading}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            generate();
          }
        }}
        placeholder={
          currentValue && stripHtmlValidation('normal', currentValue, true).trim()
            ? t(
                'masssocial_ai_prompt_edit_placeholder',
                'Pide un cambio: "hazlo más corto", "cambia el gancho"...'
              )
            : t(
                'masssocial_ai_prompt_placeholder',
                'Dile a la IA qué escribir: "reel sobre sueldos junior en ciber"...'
              )
        }
        className="flex-1 min-w-0 bg-newBgColorInner h-[42px] px-[12px] border border-newTableBorder rounded-[8px] outline-none text-[14px]"
      />
      {canUndo && !loading && (
        <Button secondary={true} onClick={onUndo}>
          {t('masssocial_ai_prompt_undo', 'Deshacer')}
        </Button>
      )}
      <Button
        loading={loading}
        disabled={!instruction.trim()}
        onClick={generate}
      >
        {t('masssocial_ai_prompt_generate', 'Escribir con IA')}
      </Button>
    </div>
  );
};
