module Upgrades
  ( upgradeCost
  , upgradeName
  , nextUpgrade
  , canBuyUpgrade
  , upgradeDescription
  , buyUpgrade
  , isInflectionUpgrade
  , inflectionUpgradeMessage
  ) where

import Prelude
import Data.Foldable (elem)
import Data.Int (toNumber)
import Data.Lens (LensP(), (^.), (+~), (-~), (.~))

import Types
import Lenses
import Util

upgradeCost :: Upgrade -> Clicks
upgradeCost (CPS1 n _) = Clicks (upgradeCostPolynomial 25.0 n)
upgradeCost (CPS2 n _) = Clicks (upgradeCostPolynomial 5000.0 n)
upgradeCost (CPS3 n _) = Clicks (upgradeCostPolynomial 750000.0 n)
upgradeCost (CPS4 n _) = Clicks (upgradeCostPolynomial 95000000.0 n)
upgradeCost (CPS5 n _) = Clicks (upgradeCostPolynomial 8250000000.0 n)
upgradeCost (Burst1 n _) = Clicks (upgradeCostPolynomial 10.0 n)
upgradeCost (Burst2 n _) = Clicks (upgradeCostPolynomial 6000.0 n)
upgradeCost (Burst3 n _) = Clicks (upgradeCostPolynomial 850000.0 n)
upgradeCost (Burst4 n _) = Clicks (upgradeCostPolynomial 72000000.0 n)
upgradeCost (Burst5 n _) = Clicks (upgradeCostPolynomial 7500000000.0 n)

upgradeCostPolynomial :: Number -> Int -> Number
upgradeCostPolynomial coeff level = upgradeCostModifier level * coeff * 1.2 ^ (toNumber level)

upgradeCostModifier :: Int -> Number
upgradeCostModifier n
  | n <= 10 = 1.0
  | n <= 25 = 0.8
  | n <= 50 = 0.5
  | n <= 75 = 0.25
  | n <= 100 = 0.125
  | otherwise = 0.0625

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
upgradeDescription (Burst3 _ _) Stone = "funerals are a basic human rite"
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
upgradeBoost (CPS1 n _) = 0.1 * upgradeBoostModifier n
upgradeBoost (CPS2 n _) = 100.0 * upgradeBoostModifier n
upgradeBoost (CPS3 n _) = 40000.0 * upgradeBoostModifier n
upgradeBoost (CPS4 n _) = 6000000.0 * upgradeBoostModifier n
upgradeBoost (CPS5 n _) = 800000000.0 * upgradeBoostModifier n
upgradeBoost (Burst1 n _) = 0.2 * upgradeBoostModifier n
upgradeBoost (Burst2 n _) = 400.0 * upgradeBoostModifier n
upgradeBoost (Burst3 n _) = 55000.0 * upgradeBoostModifier n
upgradeBoost (Burst4 n _) = 5900000.0 * upgradeBoostModifier n
upgradeBoost (Burst5 n _) = 100000000.0 * upgradeBoostModifier n

upgradeBoostModifier :: Int -> Number
upgradeBoostModifier n
  | n <= 10 = 1.0
  | n <= 25 = 1.5
  | n <= 50 = 3.0
  | n <= 75 = 5.0
  | n <= 100 = 10.0
  | otherwise = 15.0

isInflectionUpgrade :: Upgrade -> Boolean
isInflectionUpgrade up = (up ^. viewLevel) `elem` [10, 25, 50, 75, 100]

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

inflectionUpgradeMessage :: Upgrade -> Age -> String
inflectionUpgradeMessage up age = upgradeName up age ++ " cost down, boost up"
