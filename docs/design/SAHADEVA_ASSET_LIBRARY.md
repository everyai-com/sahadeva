# Sahadeva asset library

The canonical library lives in `public/brand/sahadeva`. It contains the Sahadeva brand marks and 156 Jyotiṣa/system concepts across Navagraha, rāśi, bhāva, nakṣatra, life-area, remedy, timing, tithi, yoga, and karaṇa families. Many are supplied in multiple authored sizes.

Use the typed React library instead of constructing asset URLs in product code:

```tsx
import { SahadevaIcon } from "../../design/assetLibrary";

<SahadevaIcon family="graha" name="Jupiter" size={24} />
<SahadevaIcon family="nakshatra" name="rohini" size={128} />
<SahadevaIcon family="tithi" name={7} size={24} decorative />
```

For non-React code, use `sahadevaAssetPath(family, name, size)`. The resolver validates canonical names, understands English graha aliases, pads tithi filenames, and chooses the closest available authored size.

The visual browser is `public/brand/sahadeva/catalog.html`. Canonical metadata is in `registry.json` and `system-registry.json`. Cultural approval remains governed by `SAHADEVA_ASSET_PROVENANCE.md`; these are modern Sahadeva interpretations, not claimed historical symbols.
