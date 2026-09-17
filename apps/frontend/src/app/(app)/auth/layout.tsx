import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Toaster } from '@gitroom/react/toaster/toaster';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <MantineWrapper>
      <Toaster />
      <div className="bg-[#0E0E0E] flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen text-white">
        {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
        <ReturnUrlComponent />
        <div className="flex flex-col py-[40px] px-[20px] flex-1 lg:w-[600px] lg:flex-none rounded-[12px] text-white p-[12px] bg-[#1A1919]">
          <div className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col text-white">
            <LogoTextComponent />
            <div className="flex">{children}</div>
          </div>
        </div>
        <div className="flex-1 pt-[88px] hidden lg:flex flex-col items-center">
          <div className="text-center flex flex-col gap-[20px] max-w-[560px]">
            <div className="text-[64px] font-[800] tracking-[4px] leading-none text-white">
              MASSSOCIAL
            </div>
            <div className="text-[28px] text-[#E5007D] font-[600]">
              Programa tus redes en masa
            </div>
            <ul className="text-[18px] text-white/80 flex flex-col gap-[12px] mt-[20px]">
              <li className="flex items-center justify-center gap-[10px]">
                <span className="w-[8px] h-[8px] rounded-full bg-[#19D3FF]" />
                Programa reels, posts y stories en masa
              </li>
              <li className="flex items-center justify-center gap-[10px]">
                <span className="w-[8px] h-[8px] rounded-full bg-[#19D3FF]" />
                Instagram, TikTok y 20 redes más
              </li>
              <li className="flex items-center justify-center gap-[10px]">
                <span className="w-[8px] h-[8px] rounded-full bg-[#19D3FF]" />
                Un calendario para todos tus proyectos
              </li>
            </ul>
          </div>
        </div>
      </div>
    </MantineWrapper>
  );
}
