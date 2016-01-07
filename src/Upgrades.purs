module Upgrades
  ( upgradeCost
  , upgradeName
  , nextUpgrade
  , canBuyUpgrade
  , upgradeBoost
  , upgradeDescription
  , buyUpgrade
  ) where

import Prelude
import Data.Int (toNumber)
import Data.Lens (LensP(), (^.), (+~), (-~), (.~))

import Types
import Lenses
import Util

upgradeCost :: Upgrade -> Clicks
upgradeCost (CPS1 n _) = Clicks (makeUpgrade 25.0 n)
upgradeCost (CPS2 n _) = Clicks (makeUpgrade 5000.0 n)
upgradeCost (CPS3 n _) = Clicks (makeUpgrade 750000.0 n)
upgradeCost (CPS4 n _) = Clicks (makeUpgrade 95000000.0 n)
upgradeCost (CPS5 n _) = Clicks (makeUpgrade 8250000000.0 n)
upgradeCost (Burst1 n _) = Clicks (makeUpgrade 10.0 n)
upgradeCost (Burst2 n _) = Clicks (makeUpgrade 6000.0 n)
upgradeCost (Burst3 n _) = Clicks (makeUpgrade 850000.0 n)
upgradeCost (Burst4 n _) = Clicks (makeUpgrade 72000000.0 n)
upgradeCost (Burst5 n _) = Clicks (makeUpgrade 7500000000.0 n)

makeUpgrade :: Number -> Int -> Number
makeUpgrade coeff total = upgradePolynomial coeff (toNumber total)

upgradePolynomial :: Number -> Number -> Number
upgradePolynomial coeff total = coeff * 1.2 ^ total --coeff + coeff * 0.1 * total ^ 2.0 + 10.0 * total + 13.0

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
upgradeDescription (CPS3 _ _) Stone = "fishing for landsharks?"
upgradeDescription (CPS4 _ _) Stone = "Can I interest you in some delicious BEETS!?"
upgradeDescription (CPS5 _ _) Stone = "never leave the Stone Age without 'em"
upgradeDescription (Burst1 _ _) Stone = "no more wearing leaves as underwear"
upgradeDescription (Burst2 _ _) Stone = "Oh, my love, my darling, I've hungered for your touch ... "
upgradeDescription (Burst3 _ _) Stone = ""
upgradeDescription (Burst4 _ _) Stone = "are the huts made out of mammoth bone, or are they just really large bone huts?"
upgradeDescription (Burst5 _ _) Stone = "is that a painting of a spaceship ... ?"

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
  let currClicks = state ^. currentClicks
      currUpgrade = state ^. upgrades <<< optic
      next = nextUpgrade currUpgrade
      nextCost = upgradeCost next
   in currClicks >= nextCost

upgradeBoost :: Upgrade -> Number
upgradeBoost (CPS1 n _) = 0.1 * upgradeModifier n
upgradeBoost (CPS2 n _) = 2.0 * upgradeModifier n
upgradeBoost (CPS3 n _) = 40.0 * upgradeModifier n
upgradeBoost (CPS4 n _) = 600.0 * upgradeModifier n
upgradeBoost (CPS5 n _) = 8000.0 * upgradeModifier n
upgradeBoost (Burst1 n _) = 0.2 * upgradeModifier n
upgradeBoost (Burst2 n _) = 4.0 * upgradeModifier n
upgradeBoost (Burst3 n _) = 55.0 * upgradeModifier n
upgradeBoost (Burst4 n _) = 590.0 * upgradeModifier n
upgradeBoost (Burst5 n _) = 10000.0 * upgradeModifier n

upgradeModifier :: Int -> Number
upgradeModifier n
  | n < 25 = 1.0
  | n < 50 = 2.0
  | n < 75 = 4.0
  | n < 100 = 8.0
  | otherwise = 16.0

buyUpgrade :: Upgrade -> State -> State
buyUpgrade up@(CPS1 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps1
buyUpgrade up@(CPS2 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps2
buyUpgrade up@(CPS3 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps3
buyUpgrade up@(CPS4 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps4
buyUpgrade up@(CPS5 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps5
buyUpgrade up@(Burst1 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst1
buyUpgrade up@(Burst2 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst2
buyUpgrade up@(Burst3 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst3
buyUpgrade up@(Burst4 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst4
buyUpgrade up@(Burst5 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst5

recordPurchase :: Upgrade -> LensP Upgrades Upgrade -> State -> State
recordPurchase up optic = (currentClicks -~ upgradeCost up)
                      <<< (upgrades <<< optic .~ up)

installUpgrade :: Upgrade -> LensP State Number -> State -> State
installUpgrade up optic = optic +~ upgradeBoost up
