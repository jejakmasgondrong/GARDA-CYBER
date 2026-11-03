import { FlaggedHandled } from './FlaggedHandled';
import { PlaybookPanel } from './PlaybookPanel';
import { ComplianceBaseline } from './ComplianceBaseline';

export function LiveBottomRow() {
  return (
    <div className="gc-live mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <FlaggedHandled />
      <PlaybookPanel />
      <ComplianceBaseline />
    </div>
  );
}
