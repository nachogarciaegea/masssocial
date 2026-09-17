'use client';

import { FC, useCallback } from 'react';
import clsx from 'clsx';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ChannelView } from '@gitroom/frontend/components/masssocial/types';
import {
  ChannelAvatar,
  EmptyState,
} from '@gitroom/frontend/components/masssocial/shared';

export const ChannelPicker: FC<{
  channels: (ChannelView & { subLabel?: string })[];
  selected: string[];
  onChange: (ids: string[]) => void;
}> = ({ channels, selected, onChange }) => {
  const t = useT();

  const toggle = useCallback(
    (id: string) => () => {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
        return;
      }
      onChange([...selected, id]);
    },
    [selected, onChange]
  );

  if (!channels.length) {
    return (
      <EmptyState text={t('masssocial_no_channels', 'No hay canales conectados')} />
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex gap-[12px] text-[12px] text-textItemBlur">
        <span
          className="cursor-pointer hover:underline"
          onClick={() => onChange(channels.filter((c) => !c.disabled).map((c) => c.id))}
        >
          {t('masssocial_select_all', 'Seleccionar todos')}
        </span>
        <span className="cursor-pointer hover:underline" onClick={() => onChange([])}>
          {t('masssocial_select_none', 'Ninguno')}
        </span>
        <span className="flex-1 text-end">
          {t('masssocial_selected_count', '{{n}} seleccionados', {
            n: selected.length,
          })}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[8px]">
        {channels.map((channel) => {
          const checked = selected.includes(channel.id);
          return (
            <div
              key={channel.id}
              onClick={toggle(channel.id)}
              className={clsx(
                'flex items-center gap-[10px] p-[10px] rounded-[8px] border cursor-pointer transition-all',
                checked
                  ? 'border-btnPrimary bg-boxHover'
                  : 'border-newTableBorder bg-newTableHeader hover:bg-boxHover',
                channel.disabled && 'opacity-50'
              )}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  disableForm={true}
                  checked={checked}
                  onChange={toggle(channel.id)}
                />
              </div>
              <ChannelAvatar channel={channel} size={30} />
              <div className="flex flex-col min-w-0 flex-1">
                <div className="text-[13px] truncate">{channel.name}</div>
                <div className="text-[11px] text-textItemBlur truncate">
                  {channel.subLabel || channel.identifier}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
