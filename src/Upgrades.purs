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

upgradeCost :: Upgrade -> Number
upgradeCost (CPS1 n _) = makeUpgrade 25 n
upgradeCost (CPS2 n _) = makeUpgrade 500 n
upgradeCost (CPS3 n _) = makeUpgrade 7500 n
upgradeCost (CPS4 n _) = makeUpgrade 90000 n
upgradeCost (CPS5 n _) = makeUpgrade 825000 n
upgradeCost (Burst1 n _) = makeUpgrade 10 n
upgradeCost (Burst2 n _) = makeUpgrade 600 n
upgradeCost (Burst3 n _) = makeUpgrade 8500 n
upgradeCost (Burst4 n _) = makeUpgrade 72000 n
upgradeCost (Burst5 n _) = makeUpgrade 7500000 n

makeUpgrade :: Int -> Int -> Number
makeUpgrade coeff total = upgradePolynomial (toNumber coeff) (toNumber total)

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
  let currClicks = state ^. currentClicksNumber
      currUpgrade = state ^. upgrades <<< optic
      next = nextUpgrade currUpgrade
      nextCost = upgradeCost next
   in currClicks >= nextCost

upgradeBoost :: Upgrade -> Number
upgradeBoost (CPS1 n _) = 0.1 * toNumber n
upgradeBoost (CPS2 n _) = 2.0 * toNumber n
upgradeBoost (CPS3 n _) = 40.0 * toNumber n
upgradeBoost (CPS4 n _) = 600.0 * toNumber n
upgradeBoost (CPS5 n _) = 8000.0 * toNumber n
upgradeBoost (Burst1 n _) = 0.2 * toNumber n
upgradeBoost (Burst2 n _) = 4.0 * toNumber n
upgradeBoost (Burst3 n _) = 55.0 * toNumber n
upgradeBoost (Burst4 n _) = 590.0 * toNumber n
upgradeBoost (Burst5 n _) = 10000.0 * toNumber n

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
recordPurchase up optic = (currentClicksNumber -~ upgradeCost up)
                      <<< (upgrades <<< optic .~ up)

installUpgrade :: Upgrade -> LensP State Number -> State -> State
installUpgrade up optic = optic +~ upgradeBoost up
