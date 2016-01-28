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

import Types
import Lenses
import Util

import Upgrades.Stone as Stone
import Upgrades.Bronze as Bronze

upgradeCost :: Age -> Upgrade -> Clicks
upgradeCost Stone = Stone.upgradeCost
upgradeCost _ = const zero --FIXME

upgradeName :: Age -> Upgrade -> String
upgradeName Stone = Stone.upgradeName
upgradeName Bronze = Bronze.upgradeName
upgradeName _ = const "Not implemented yet" --FIXME

nextUpgrade :: Age -> Upgrade -> Upgrade
nextUpgrade Stone = Stone.nextUpgrade
--FIXME

canBuyUpgrade :: State -> LensP Upgrades Upgrade -> Boolean
canBuyUpgrade state =
  case state.age of
       Stone -> Stone.canBuyUpgrade state
       _ -> const false--FIXME

upgradeDescription :: Age -> Upgrade -> String
upgradeDescription Stone = Stone.upgradeDescription
upgradeDescription _ = const "Not implemented yet"--FIXME

buyUpgrade :: Age -> Upgrade -> State -> State
buyUpgrade Stone = Stone.buyUpgrade
buyUpgrade _ _ _ = initialState--FIXME

isInflectionUpgrade :: Age -> Upgrade -> Boolean
isInflectionUpgrade Stone = Stone.isInflectionUpgrade
isInflectionUpgrade _ = const false --FIXME

inflectionUpgradeMessage :: Age -> Upgrade -> String
inflectionUpgradeMessage Stone = Stone.inflectionUpgradeMessage
inflectionUpgradeMessage _ = const "Not implemented yet"--FIXME 
