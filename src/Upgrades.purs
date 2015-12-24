module Upgrades where

import Prelude

import Data.Foldable (fold)

import Types
import Util
import Blocks

upgrade :: Upgrade -> Component
upgrade up = actionButton (Buy up) (show up)

availableUpgrades :: Environment -> Array Upgrade
availableUpgrades { cps = cps, clickBurst = clickBurst, clicks = clicks }
  = fold $ [availableBurst clickBurst, availableCPS cps] <*> [clicks]
    where
      availableBurst curr total
        | total >= 10.0 * 2.0^ curr = [Burst (curr * 1.5)]
        | otherwise = []
      availableCPS curr total
        | total >= 10.0 * 2.0 ^ curr = [CPS (curr * 1.3 + 1.0)]
        | otherwise = []

--nextUpgrade :: Number -> Upgrade
--nextUpgrade clicks = 10.0 * 1.3 
