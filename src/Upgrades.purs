module Upgrades
  ( upgradeCost
  , upgradeName
  , nextUpgrade
  , canBuyUpgrade
  , upgradeDescription
  , buyUpgrade
  , isInflectionUpgrade
  , inflectionUpgradeMessage
  , cpsFromUpgrades
  , burstFromUpgrades
  ) where

import Prelude
import Data.Foldable (elem, sum)
import Data.Int (toNumber)
import Data.Lens (LensP(), (^.), (+~), (-~), (.~))

import Types
import Lenses
import Util

upgradeCost :: Upgrade -> Clicks
upgradeCost (Misc1 n)    = Clicks (upgradeCostPolynomial 10.0 n)
upgradeCost (Misc2 n)    = Clicks (upgradeCostPolynomial 500.0 n)
upgradeCost (Tech1 n)    = Clicks (upgradeCostPolynomial 7500.0 n)
upgradeCost (Tech2 n)    = Clicks (upgradeCostPolynomial 95000.0 n)
upgradeCost (Phil1 n)    = Clicks (upgradeCostPolynomial 825000.0 n)
upgradeCost (Phil2 n)    = Clicks (upgradeCostPolynomial 5200000.0 n)
upgradeCost (Poli1 n)    = Clicks (upgradeCostPolynomial 60000000.0 n)
upgradeCost (Poli2 n)    = Clicks (upgradeCostPolynomial 850000000.0 n)
upgradeCost (Science1 n) = Clicks (upgradeCostPolynomial 8500000000.0 n)
upgradeCost (Science2 n) = Clicks (upgradeCostPolynomial 75000000000.0 n)

upgradeCostPolynomial :: Number -> Int -> Number
upgradeCostPolynomial coeff level = upgradeCostModifier level * coeff * 1.2 ^ (toNumber level)

upgradeCostModifier :: Int -> Number
upgradeCostModifier n
  | n <= 10 = 1.5
  | n <= 25 = 1.0
  | n <= 50 = 0.75
  | n <= 75 = 0.5
  | n <= 100 = 0.25
  | otherwise = 0.125

upgradeName :: Upgrade -> Age -> String
upgradeName (Misc1 _) Stone = "language"
upgradeName (Misc2 _) Stone = "spear tips"
upgradeName (Tech1 _) Stone = "fire!"
upgradeName (Tech2 _) Stone = "stone tools"
upgradeName (Phil1 _) Stone = "funeral rites"
upgradeName (Phil2 _) Stone = "cave paintings"
upgradeName (Poli1 _) Stone = "basic fishing"
upgradeName (Poli2 _) Stone = "rudimentary farming"
upgradeName (Science1 _) Stone = "dog domestication"
upgradeName (Science2 _) Stone = "abstract numbers"

upgradeDescription :: Upgrade -> Age -> String
upgradeDescription (Misc1 _) Stone = "No more grunt-and-point for you!"
upgradeDescription (Misc2 _) Stone = "Tip: a well-balanced spear is crucial for hunting."
upgradeDescription (Tech1 _) Stone = "We DID start the fire."
upgradeDescription (Tech2 _) Stone = "Never leave the Stone Age without 'em."
upgradeDescription (Phil1 _) Stone = "Funerals are a basic human rite."
upgradeDescription (Phil2 _) Stone = "You're no Picasso, but your paintings will last longer."
upgradeDescription (Poli1 _) Stone = "Fishing for landsharks?"
upgradeDescription (Poli2 _) Stone = "Can I interest you in some delicious BEETS?"
upgradeDescription (Science1 _) Stone = "A Clickonian's best friend."
upgradeDescription (Science2 _) Stone = "You've discovered that two clicks and two dogs both share 'twoness.' You also almost discovered the ultrafilter lemma, but you couldn't write it down fast enough."

nextUpgrade :: Upgrade -> Upgrade
nextUpgrade (Misc1 n) = Misc1 (n + 1)
nextUpgrade (Misc2 n) = Misc2 (n + 1)
nextUpgrade (Tech1 n) = Tech1 (n + 1)
nextUpgrade (Tech2 n) = Tech2 (n + 1)
nextUpgrade (Phil1 n) = Phil1 (n + 1)
nextUpgrade (Phil2 n) = Phil2 (n + 1)
nextUpgrade (Poli1 n) = Poli1 (n + 1)
nextUpgrade (Poli2 n) = Poli2 (n + 1)
nextUpgrade (Science1 n) = Science1 (n + 1)
nextUpgrade (Science2 n) = Science2 (n + 1)

canBuyUpgrade :: State -> LensP Upgrades Upgrade -> Boolean
canBuyUpgrade state optic =
  let currClicks = state ^. currentClicks
      currUpgrade = state ^. upgrades <<< optic
      next = nextUpgrade currUpgrade
      nextCost = upgradeCost next
   in currClicks >= nextCost

upgradeBoost :: Upgrade -> Number
upgradeBoost (Misc1 n)    = 0.5 * upgradeBoostModifier n
upgradeBoost (Misc2 n)    = 4.0 * upgradeBoostModifier n
upgradeBoost (Tech1 n)    = 40.0 * upgradeBoostModifier n
upgradeBoost (Tech2 n)    = 600.0 * upgradeBoostModifier n
upgradeBoost (Phil1 n)    = 8000.0 * upgradeBoostModifier n
upgradeBoost (Phil2 n)    = 122820.5 * upgradeBoostModifier n
upgradeBoost (Poli1 n)    = 3141592.6 * upgradeBoostModifier n
upgradeBoost (Poli2 n)    = 27182818.2 * upgradeBoostModifier n
upgradeBoost (Science1 n) = 590000000.0 * upgradeBoostModifier n
upgradeBoost (Science2 n) = 10000000000.0 * upgradeBoostModifier n

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
buyUpgrade up@(Misc1 _) = installUpgrade up burstNumber 0.15
                      <<< installUpgrade up cpsNumber 1.0
                      <<< recordPurchase up misc1
buyUpgrade up@(Misc2 _) = installUpgrade up cpsNumber 1.0
                      <<< installUpgrade up burstNumber 0.2
                      <<< recordPurchase up misc2
buyUpgrade up@(Tech1 _) = installUpgrade up cpsNumber 1.0 <<< recordPurchase up tech1
buyUpgrade up@(Tech2 _) = installUpgrade up cpsNumber 1.0 <<< recordPurchase up tech2
buyUpgrade up@(Phil1 _) = installUpgrade up cpsNumber 1.0 <<< recordPurchase up phil1
buyUpgrade up@(Phil2 _) = installUpgrade up cpsNumber 1.0 <<< recordPurchase up phil2
buyUpgrade up@(Poli1 _) = installUpgrade up cpsNumber 1.0 <<< recordPurchase up poli1
buyUpgrade up@(Poli2 _) = installUpgrade up cpsNumber 1.0 <<< recordPurchase up poli2
buyUpgrade up@(Science1 _) = installUpgrade up cpsNumber 1.0 <<< recordPurchase up science1
buyUpgrade up@(Science2 _) = installUpgrade up cpsNumber 1.0 <<< recordPurchase up science2

recordPurchase :: Upgrade -> LensP Upgrades Upgrade -> State -> State
recordPurchase up optic = (currentClicks -~ upgradeCost up)
                      <<< (upgrades <<< optic .~ up)

installUpgrade :: Upgrade -> LensP State Number -> Number -> State -> State
installUpgrade up optic coeff = optic +~ coeff * upgradeBoost up

inflectionUpgradeMessage :: Upgrade -> Age -> String
inflectionUpgradeMessage up age = upgradeName up age ++ " cost down, boost up"

sumUpgrade :: Upgrade -> Number
sumUpgrade (Misc1 n) = sum (map (upgradeBoost <<< Misc1) (1 ... n))
sumUpgrade (Misc2 n) = sum (map (upgradeBoost <<< Misc2) (1 ... n))
sumUpgrade (Tech1 n) = sum (map (upgradeBoost <<< Tech1) (1 ... n))
sumUpgrade (Tech2 n) = sum (map (upgradeBoost <<< Tech2) (1 ... n))
sumUpgrade (Phil1 n) = sum (map (upgradeBoost <<< Phil1) (1 ... n))
sumUpgrade (Phil2 n) = sum (map (upgradeBoost <<< Phil2) (1 ... n))
sumUpgrade (Poli1 n) = sum (map (upgradeBoost <<< Poli1) (1 ... n))
sumUpgrade (Poli2 n) = sum (map (upgradeBoost <<< Poli2) (1 ... n))
sumUpgrade (Science1 n) = sum (map (upgradeBoost <<< Science1) (1 ... n))
sumUpgrade (Science2 n) = sum (map (upgradeBoost <<< Science2) (1 ... n))

cpsFromUpgrades :: Upgrades -> ClicksPerSecond
cpsFromUpgrades (Upgrades u) =
  (initialState ^. cps) + ClicksPerSecond (sum (map sumUpgrade upgradeArray))
  where
    upgradeArray = [ u.misc1, u.misc2, u.tech1, u.tech2, u.phil2 ]

burstFromUpgrades :: Upgrades -> Clicks
burstFromUpgrades (Upgrades u) =
  (initialState ^. burst) + Clicks (sum (map sumUpgrade upgradeArray))
  where
    upgradeArray = [ u.phil2, u.poli1, u.poli2, u.science1, u.science2 ]
