module Upgrades
  ( upgradeCost
  , upgradeFromAge
  , nextUpgrade
  , canBuyUpgrade
  , upgradeBoost
  ) where

import Prelude
import Data.Int (toNumber)
import Data.Lens ((^.))
import Types
import Util

upgradeCost :: Upgrade -> Number
upgradeCost (CPS1 n _) = makeUpgrade 50 n
upgradeCost (CPS2 n _) = makeUpgrade 100 n
upgradeCost (CPS3 n _) = makeUpgrade 500 n
upgradeCost (CPS4 n _) = makeUpgrade 1000 n
upgradeCost (CPS5 n _) = makeUpgrade 10000 n
upgradeCost _ = 0.0

makeUpgrade :: Int -> Int -> Number
makeUpgrade coeff total = upgradePolynomial (toNumber coeff) $ toNumber total

upgradePolynomial :: Number -> Number -> Number
upgradePolynomial coeff total = coeff + coeff * 0.1 * total ^ 2.0 + 10.0 * total + 13.0

upgradeFromAge :: forall a. Upgrade -> Age -> String
upgradeFromAge (CPS1 _ _) Stone = "cave art"

nextUpgrade :: Upgrade -> Upgrade
nextUpgrade (CPS1 n t) = CPS1 (n + 1) t
nextUpgrade (CPS2 n t) = CPS2 (n + 1) t
nextUpgrade (CPS3 n t) = CPS3 (n + 1) t
nextUpgrade (CPS4 n t) = CPS4 (n + 1) t
nextUpgrade (CPS5 n t) = CPS5 (n + 1) t
nextUpgrade (Burst1 n t) = Burst1 (n + 1) t
nextUpgrade (Burst2 n t) = Burst2 (n + 1) t
nextUpgrade (Burst3 n t) = Burst3 (n + 1) t
nextUpgrade (Burst4 n t) = Burst4 (n + 1) t
nextUpgrade (Burst5 n t) = Burst5 (n + 1) t

canBuyUpgrade :: State -> Boolean
canBuyUpgrade state =
  let currClicks = state ^. currentClicks <<< clicks
      currUpgrade = state ^. upgrades <<< cps1
      next = nextUpgrade currUpgrade
      nextCost = upgradeCost next
   in currClicks >= nextCost

upgradeBoost :: Upgrade -> Number
upgradeBoost (CPS1 n _) = toNumber n
upgradeBoost (CPS2 n _) = 1.2 * toNumber n
upgradeBoost (CPS3 n _) = 1.4 * toNumber n
upgradeBoost (CPS4 n _) = 1.6 * toNumber n
upgradeBoost (CPS5 n _) = 1.8 * toNumber n
upgradeBoost (Burst1 n _) = toNumber n
upgradeBoost (Burst2 n _) = 1.2 * toNumber n
upgradeBoost (Burst3 n _) = 1.4 * toNumber n
upgradeBoost (Burst4 n _) = 1.6 * toNumber n
upgradeBoost (Burst5 n _) = 1.8 * toNumber n
