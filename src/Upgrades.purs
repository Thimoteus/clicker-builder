module Upgrades
  ( cpsFromUpgrades
  , burstFromUpgrades
  ) where

import Prelude

import Types

import Upgrades.Stone as Stone
import Upgrades.Bronze as Bronze

cpsFromUpgrades :: Age -> Upgrades -> ClicksPerSecond
cpsFromUpgrades Stone = Stone.cpsFromUpgrades

burstFromUpgrades :: Age -> Upgrades -> Clicks
burstFromUpgrades Stone = Stone.burstFromUpgrades
