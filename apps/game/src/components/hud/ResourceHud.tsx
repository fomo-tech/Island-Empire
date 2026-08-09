import type { ResourceBag, ResourceKey } from "@island/shared";
import { RESOURCE_ORDER, ResourceHudItem } from "../ResourceDisplay";
import { detectDeviceLanguage, translate } from "../../game/i18n";

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
  const language = detectDeviceLanguage();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return (
    <section className="rok-ref-resources" aria-label={t("kingdom")}>
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
