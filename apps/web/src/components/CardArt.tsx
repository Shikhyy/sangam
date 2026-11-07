"use client";

import { useEffect, useRef } from "react";
import { type FieldControl, GradientField } from "./GradientField";

/** The painting behind the share card, shaped by the person's mix. */
export function CardArt({ hindiShare, switchRate }: { hindiShare: number; switchRate: number }) {
  const control = useRef<FieldControl>({ share: hindiShare, tangle: Math.min(1, switchRate * 1.6), level: 0 });

  useEffect(() => {
    control.current.share = hindiShare;
    control.current.tangle = Math.min(1, switchRate * 1.6);
  }, [hindiShare, switchRate]);

  return <GradientField className="fr-bg" control={control} />;
}
