type GrahaIconProps = {
  name: string;
  size?: 20 | 24 | 32 | 48 | 128;
  className?: string;
  decorative?: boolean;
};

const IDs: Record<string, string> = {
  Sun: "surya", Surya: "surya",
  Moon: "chandra", Chandra: "chandra",
  Mars: "mangala", Mangala: "mangala",
  Mercury: "budha", Budha: "budha",
  Jupiter: "guru", Guru: "guru",
  Venus: "shukra", Shukra: "shukra",
  Saturn: "shani", Shani: "shani",
  Rahu: "rahu", Ketu: "ketu",
};

export function GrahaIcon({ name, size = 24, className, decorative = false }: GrahaIconProps) {
  const id = IDs[name] || name.toLowerCase();
  const assetSize = size === 20 || size === 32 ? 24 : size;
  return (
    <img
      className={className}
      src={`/brand/cosmithra/graha/${id}-${assetSize}.svg`}
      width={size}
      height={size}
      alt={decorative ? "" : `${name} symbol`}
      aria-hidden={decorative || undefined}
    />
  );
}

export function CosmithraMark({ size = 40, className }: { size?: number; className?: string }) {
  return <img className={className} src="/brand/cosmithra/mark.svg" width={size} height={size} alt="" aria-hidden="true" />;
}
