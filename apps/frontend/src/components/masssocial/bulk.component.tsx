'use client';

import { FC, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import { BulkImportComponent } from '@gitroom/frontend/components/masssocial/bulk-import.component';
import { BulkBatchComponent } from '@gitroom/frontend/components/masssocial/bulk-batch.component';
import { EvergreenComponent } from '@gitroom/frontend/components/masssocial/evergreen.component';

type Tab = 'import' | 'batch' | 'evergreen';

export const BulkComponent: FC = () => {
  const t = useT();
  const [tab, setTab] = useState<Tab>('import');

  const list = useMemo(
    () => [
      { tab: 'import' as Tab, label: t('masssocial_tab_import', 'Importar CSV/Excel') },
      { tab: 'batch' as Tab, label: t('masssocial_tab_batch', 'Lotes') },
      { tab: 'evergreen' as Tab, label: t('masssocial_tab_evergreen', 'Perennes') },
    ],
    [t]
  );

  return (
    <>
      <div className="bg-newBgColorInner p-[20px] flex flex-col transition-all w-[260px]">
        <div className="flex flex-1 flex-col gap-[15px]">
          {list.map(({ tab: tabKey, label }) => (
            <div
              key={tabKey}
              className={clsx(
                'cursor-pointer flex items-center gap-[12px] group/profile hover:bg-boxHover rounded-e-[8px]',
                tabKey === tab && 'bg-boxHover'
              )}
              onClick={() => setTab(tabKey)}
            >
              <div
                className={clsx(
                  'h-full w-[4px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity',
                  tabKey === tab && 'opacity-100'
                )}
              >
                <SVGLine />
              </div>
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px] min-w-0">
        {tab === 'import' && <BulkImportComponent />}
        {tab === 'batch' && <BulkBatchComponent />}
        {tab === 'evergreen' && <EvergreenComponent />}
      </div>
    </>
  );
};
