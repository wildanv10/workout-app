import { Suspense } from 'react';
import EditSetupForm from '@/components/EditSetupForm';

/** Setup ids are created by the user at runtime, so the id streams in. */
async function Resolve({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditSetupForm id={id} />;
}

export default function EditSetupPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Resolve params={params} />
    </Suspense>
  );
}
