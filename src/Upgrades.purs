module Upgrades
  ( upgradeCost
  , upgradeName
  , nextUpgrade
  , canBuyUpgrade
  , upgradeBoost
  , upgradeDescription
  ) where

import Prelude
import Data.Int (toNumber)
import Data.Lens (LensP(), (^.))

import Types
import Util
import Lenses

upgradeCost :: Upgrade -> Number
upgradeCost (CPS1 n _) = makeUpgrade 25 n
upgradeCost (CPS2 n _) = makeUpgrade 50 n
upgradeCost (CPS3 n _) = makeUpgrade 100 n
upgradeCost (CPS4 n _) = makeUpgrade 250 n
upgradeCost (CPS5 n _) = makeUpgrade 1000 n
upgradeCost (Burst1 n _) = makeUpgrade 25 n
upgradeCost (Burst2 n _) = makeUpgrade 50 n
upgradeCost (Burst3 n _) = makeUpgrade 100 n
upgradeCost (Burst4 n _) = makeUpgrade 250 n
upgradeCost (Burst5 n _) = makeUpgrade 1000 n

makeUpgrade :: Int -> Int -> Number
makeUpgrade coeff total = upgradePolynomial (toNumber coeff) $ toNumber total

upgradePolynomial :: Number -> Number -> Number
upgradePolynomial coeff total = coeff + 5.0 * total --coeff + coeff * 0.1 * total ^ 2.0 + 10.0 * total + 13.0

upgradeName :: Upgrade -> Age -> String
upgradeName (CPS1 _ _) Stone = "fire!"
upgradeName (CPS2 _ _) Stone = "spear tips"
upgradeName (CPS3 _ _) Stone = "basic fishing"
upgradeName (CPS4 _ _) Stone = "rudimentary farming"
upgradeName (CPS5 _ _) Stone = "stone tools"
upgradeName (Burst1 _ _) Stone = "animal skin clothing"
upgradeName (Burst2 _ _) Stone = "pottery"
upgradeName (Burst3 _ _) Stone = "funeral rites"
upgradeName (Burst4 _ _) Stone = "mammoth bone huts"
upgradeName (Burst5 _ _) Stone = "cave paintings"

upgradeDescription :: Upgrade -> Age -> String
upgradeDescription (CPS1 _ _) Stone = "we DID start the fire"
upgradeDescription (CPS2 _ _) Stone = "tip: a well-balanced spear is crucial for hunting"
upgradeDescription (CPS3 _ _) Stone = ""
upgradeDescription (CPS4 _ _) Stone = ""
upgradeDescription (CPS5 _ _) Stone = ""
upgradeDescription (Burst1 _ _) Stone = ""
upgradeDescription (Burst2 _ _) Stone = ""
upgradeDescription (Burst3 _ _) Stone = ""
upgradeDescription (Burst4 _ _) Stone = ""
upgradeDescription (Burst5 _ _) Stone = ""

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

canBuyUpgrade :: State -> LensP Upgrades Upgrade -> Boolean
canBuyUpgrade state optic =
  let currClicks = state ^. currentClicksNumber
      currUpgrade = state ^. upgrades <<< optic
      next = nextUpgrade currUpgrade
      nextCost = upgradeCost next
   in currClicks >= nextCost

upgradeBoost :: Upgrade -> Number
upgradeBoost (CPS1 n _) = 0.1 * toNumber n
upgradeBoost (CPS2 n _) = 0.2 * toNumber n
upgradeBoost (CPS3 n _) = 0.4 * toNumber n
upgradeBoost (CPS4 n _) = 0.6 * toNumber n
upgradeBoost (CPS5 n _) = 0.8 * toNumber n
upgradeBoost (Burst1 n _) = 0.1 * toNumber n
upgradeBoost (Burst2 n _) = 0.2 * toNumber n
upgradeBoost (Burst3 n _) = 0.4 * toNumber n
upgradeBoost (Burst4 n _) = 0.6 * toNumber n
upgradeBoost (Burst5 n _) = 0.8 * toNumber n
