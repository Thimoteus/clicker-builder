module Upgrades where

import Prelude
import Types
import Util
import Blocks

upgrade :: Upgrade -> Component
upgrade up = actionButton (Buy up) (show up)

availableUpgrades :: Environment -> Array Upgrade
availableUpgrades { cps = cps, clickBurst = clickBurst, clicks = clicks }
  = availableBurst clickBurst clicks ++ availableCPS cps clicks
    where
      availableBurst curr total
        | total >= 10.0 * 2 ^ curr = [Burst (curr * 1.5)]
        | otherwise = []
      availableCPS curr total
        | total >= 10.0 * 2 ^ curr = [CPS (curr * 1.3 + 1.0)]
        | otherwise = []
