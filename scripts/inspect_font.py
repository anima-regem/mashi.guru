"""Read embedded names; use only on fonts you intend to submit."""
import argparse
import json
from fontTools.ttLib import TTFont

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("font")
args = p.parse_args()
with TTFont(args.font) as f:
    print(json.dumps({"family": f["name"].getDebugName(16) or f["name"].getDebugName(1),
                      "style": f["name"].getDebugName(17) or f["name"].getDebugName(2),
                      "version": f["name"].getDebugName(5),
                      "weight": f["OS/2"].usWeightClass}, ensure_ascii=False, indent=2))
