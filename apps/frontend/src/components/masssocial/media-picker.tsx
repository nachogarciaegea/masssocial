'use client';

import { useCallback } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { MediaBox } from '@gitroom/frontend/components/media/media.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { BulkMedia } from '@gitroom/frontend/components/masssocial/types';

// Selector multiple de la mediateca. Devuelve {id, path, name, thumbnail}.
export const useMediaPicker = () => {
  const modals = useModals();
  const t = useT();

  return useCallback(
    (callback: (media: BulkMedia[]) => void) => {
      modals.openModal({
        title: t('media_library', 'Media Library'),
        askClose: false,
        closeOnEscape: true,
        fullScreen: true,
        size: 'calc(100% - 80px)',
        height: 'calc(100% - 80px)',
        children: (close) => (
          <MediaBox
            closeModal={close}
            setMedia={(list) =>
              callback(
                (list as any[]).map((m) => ({
                  id: m.id,
                  path: m.path,
                  name: m.name || m.path?.split('/').pop() || m.id,
                  thumbnail: m.thumbnail,
                }))
              )
            }
          />
        ),
      });
    },
    [modals, t]
  );
};
