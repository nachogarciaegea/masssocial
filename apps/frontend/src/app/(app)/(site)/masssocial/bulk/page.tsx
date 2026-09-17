import { BulkComponent } from '@gitroom/frontend/components/masssocial/bulk.component';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: `MASSSOCIAL Masivo`,
  description: '',
};
export default async function Index() {
  return <BulkComponent />;
}
