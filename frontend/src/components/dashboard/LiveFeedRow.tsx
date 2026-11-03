import { EventFeed } from './EventFeed';
import { IncidentQueue } from './IncidentQueue';

export function LiveFeedRow() {
  return (
    <div className="gc-live mb-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
      <EventFeed className="lg:col-span-3" />
      <IncidentQueue className="lg:col-span-2" />
    </div>
  );
}
