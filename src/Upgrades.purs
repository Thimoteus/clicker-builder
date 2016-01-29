module Upgrades
  ( cpsFromUpgrades
  , burstFromUpgrades
  ) where

import Prelude

import Types

import Age.Stone.Upgrades as Stone
import Age.Bronze.Upgrades as Bronze

cpsFromUpgrades :: Age -> Upgrades -> ClicksPerSecond
cpsFromUpgrades Stone = Stone.cpsFromUpgrades

burstFromUpgrades :: Age -> Upgrades -> Clicks
burstFromUpgrades Stone = Stone.burstFromUpgrades
