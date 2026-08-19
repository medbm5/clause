import { Experience } from '@/components/experience';
import { isMockMode } from '@/lib/config';

/**
 * A server component purely so the client tree knows, on first paint, whether
 * this deployment has a key. Mock mode is a runtime fact (no key present, or
 * MOCK_MODE=1) and the `Demo data` chip has to be honest from the very first
 * frame — not once a report comes back and reveals it.
 */
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Experience mock={isMockMode()} />;
}
