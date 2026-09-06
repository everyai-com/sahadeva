import { normalizeAssetId, SahadevaIcon, type SahadevaAssetSize } from "./assetLibrary";

type GrahaIconProps = {
  name: string;
  size?: SahadevaAssetSize;
  className?: string;
  decorative?: boolean;
};

export function GrahaIcon({ name, size = 24, className, decorative = false }: GrahaIconProps) {
  const id = normalizeAssetId("graha", name);
  return (
    <SahadevaIcon family="graha" name={name} size={size} className={`graha-icon graha-icon--${id}${className ? ` ${className}` : ""}`} decorative={decorative} />
  );
}

export { SahadevaIcon } from "./assetLibrary";

export function SahadevaMark({ size = 40, className }: { size?: number; className?: string }) {
  return <img className={className} src="/brand/sahadeva/mark.svg" width={size} height={size} alt="" aria-hidden="true" />;
}
