"use client";

import { kmToMiles, milesToKm } from "@/lib/mileage";

type SingleProps = {
  mode: "single";
  mileageKm: string;
  onMileageKmChange: (km: string) => void;
  required?: boolean;
  label?: string;
};

type RangeProps = {
  mode: "range";
  mileageMinKm: string;
  mileageMaxKm: string;
  onMileageMinKmChange: (km: string) => void;
  onMileageMaxKmChange: (km: string) => void;
  required?: boolean;
};

type Props = SingleProps | RangeProps;

const inputClass = "carq-input";

function syncFromKm(kmStr: string): string {
  const km = parseInt(kmStr, 10);
  if (!kmStr || Number.isNaN(km)) return "";
  return String(kmToMiles(km));
}

function syncFromMiles(miStr: string): string {
  const mi = parseInt(miStr, 10);
  if (!miStr || Number.isNaN(mi)) return "";
  return String(milesToKm(mi));
}

function MileagePair({
  kmValue,
  onKmChange,
  kmPlaceholder,
  miPlaceholder,
  required,
}: {
  kmValue: string;
  onKmChange: (km: string) => void;
  kmPlaceholder: string;
  miPlaceholder: string;
  required?: boolean;
}) {
  const miValue = syncFromKm(kmValue);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-1">
          Kilometers {required ? "*" : ""}
        </span>
        <input
          type="number"
          min={0}
          value={kmValue}
          onChange={(e) => onKmChange(e.target.value)}
          required={required}
          className={inputClass}
          placeholder={kmPlaceholder}
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider ml-1">
          Miles {required ? "*" : ""}
        </span>
        <input
          type="number"
          min={0}
          value={miValue}
          onChange={(e) => onKmChange(syncFromMiles(e.target.value))}
          required={required}
          className={inputClass}
          placeholder={miPlaceholder}
        />
      </div>
    </div>
  );
}

export function MileageFields(props: Props) {
  if (props.mode === "single") {
    return (
      <div className="space-y-2">
        {props.label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {props.label}
          </label>
        )}
        <MileagePair
          kmValue={props.mileageKm}
          onKmChange={props.onMileageKmChange}
          kmPlaceholder="e.g. 50000"
          miPlaceholder="e.g. 31069"
          required={props.required}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Mileage range *
      </label>
      <p className="text-xs text-gray-500 mb-2">
        Enter min and max odometer readings (KM or miles — the other field updates automatically).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Minimum
          </span>
          <MileagePair
            kmValue={props.mileageMinKm}
            onKmChange={props.onMileageMinKmChange}
            kmPlaceholder="e.g. 40000"
            miPlaceholder="e.g. 24855"
            required={props.required}
          />
        </div>
        <div className="space-y-3">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Maximum
          </span>
          <MileagePair
            kmValue={props.mileageMaxKm}
            onKmChange={props.onMileageMaxKmChange}
            kmPlaceholder="e.g. 80000"
            miPlaceholder="e.g. 49710"
            required={props.required}
          />
        </div>
      </div>
    </div>
  );
}
