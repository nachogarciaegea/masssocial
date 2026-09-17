'use client';

import { FC, ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const stripHtml = (html: string) =>
  (html || '')
    .replace(/<\/p>\s*<p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();

export const formatLocalDate = (iso: string) =>
  iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '';

const FALLBACK_TIMEZONES = [
  'Europe/Madrid',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Atlantic/Canary',
  'Africa/Casablanca',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Australia/Sydney',
  'UTC',
];

export const useTimezones = () => {
  return useMemo(() => {
    try {
      const list = (Intl as any).supportedValuesOf?.('timeZone') as
        | string[]
        | undefined;
      if (list?.length) {
        return list;
      }
    } catch {
      // ignore
    }
    return FALLBACK_TIMEZONES;
  }, []);
};

export const ChannelAvatar: FC<{
  channel: { name: string; identifier: string; picture?: string };
  size?: number;
  className?: string;
}> = ({ channel, size = 28, className }) => {
  return (
    <div
      className={clsx('relative shrink-0', className)}
      style={{ width: size, height: size }}
      title={channel.name}
    >
      <ImageWithFallback
        src={channel.picture || '/no-picture.jpg'}
        fallbackSrc="/no-picture.jpg"
        width={size}
        height={size}
        className="rounded-full w-full h-full object-cover"
      />
      <img
        src={`/icons/platforms/${channel.identifier}.png`}
        alt={channel.identifier}
        className="absolute -bottom-[2px] -end-[2px] rounded-full border border-newBgColorInner"
        style={{ width: Math.round(size / 2.2), height: Math.round(size / 2.2) }}
      />
    </div>
  );
};

export const Chip: FC<{
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  children: ReactNode;
  className?: string;
}> = ({ active, onClick, onRemove, children, className }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-[6px] px-[10px] h-[30px] rounded-[15px] text-[13px] border select-none',
        onClick && 'cursor-pointer',
        active
          ? 'bg-btnPrimary text-btnText border-btnPrimary'
          : 'bg-newTableHeader border-newTableBorder text-newTableText hover:bg-boxHover',
        className
      )}
    >
      {children}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="cursor-pointer opacity-70 hover:opacity-100 leading-none"
        >
          ×
        </span>
      )}
    </div>
  );
};

export const SectionBox: FC<{
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ title, actions, children, className }) => {
  return (
    <div
      className={clsx(
        'border border-newTableBorder rounded-[8px] p-[16px] flex flex-col gap-[12px]',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center gap-[12px]">
          {title && (
            <div className="flex-1 text-[15px] font-[500]">{title}</div>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
};

export const EmptyState: FC<{ text: string }> = ({ text }) => {
  return (
    <div className="flex items-center justify-center py-[32px] text-textItemBlur text-[14px]">
      {text}
    </div>
  );
};

export const LoadingState: FC = () => {
  const t = useT();
  return (
    <div className="animate-pulse py-[32px] text-center text-textItemBlur text-[14px]">
      {t('loading', 'Loading')}...
    </div>
  );
};

export const SmallLabel: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="text-[14px]">{children}</div>
);
