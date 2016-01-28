module Eval.Stone
  ( evalClick
  , buyUpgrade
  ) where

import Prelude
import Types
import Lenses

import Data.Lens ((+~), (^.), set)

import Upgrades.Stone as Upgrades

evalClick :: State -> State
evalClick state = ((currentClicksNumber +~ state ^. burstNumber)
                 <<< (totalClicksNumber +~ state ^. burstNumber)) state

buyUpgrade :: Upgrade -> State -> State
buyUpgrade up state
  | Upgrades.isInflectionUpgrade up =
    Upgrades.buyUpgrade up $ set message (Upgrades.inflectionUpgradeMessage up) state
  | otherwise = Upgrades.buyUpgrade up $ set message ("Upgraded " ++ Upgrades.upgradeName up) state

