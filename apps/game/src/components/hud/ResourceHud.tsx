import type { ResourceBag, ResourceKey } from "@island/shared";
import { RESOURCE_ORDER, ResourceHudItem } from "../ResourceDisplay";

type ResourceHudProps = {
  resources: ResourceBag;
  connected: boolean;
  capacityFor: (resource: ResourceKey) => number;
  rateFor: (resource: ResourceKey) => number;
  onOpenResourceShop: (resource: ResourceKey) => void;
};

export function ResourceHud({
  resources,
  connected,
  capacityFor,
  rateFor,
  onOpenResourceShop,
}: ResourceHudProps) {
  return (
    <section className="rok-ref-resources" aria-label="Tài nguyên vương quốc">
      <div className="rok-ref-resource-strip">
        {RESOURCE_ORDER.map((resource) => (
          <ResourceHudItem
            key={resource}
            resource={resource}
            value={resources[resource] || 0}
            capacity={capacityFor(resource)}
            ratePerHour={rateFor(resource)}
            connected={connected}
            onAdd={() => onOpenResourceShop(resource)}
            className="rok-ref-resource"
          />
        ))}
      </div>
    </section>
  );
}
