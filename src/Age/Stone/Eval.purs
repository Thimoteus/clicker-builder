module Age.Stone.Eval
  ( evalClick
  , buyUpgrade
  , advance
  ) where

import Prelude
import Types
import Lenses
import Age
import Disaster

import Data.Lens ((+~), (^.), set)

import Age.Stone.Upgrades as Upgrades

evalClick :: State -> State
evalClick state = ((currentClicksNumber +~ state ^. burstNumber)
                 <<< (totalClicksNumber +~ state ^. burstNumber)) state

buyUpgrade :: Upgrade -> State -> State
buyUpgrade up state
  | Upgrades.isInflectionUpgrade up =
    Upgrades.buyUpgrade up $ set message (Upgrades.inflectionUpgradeMessage up) state
  | otherwise = Upgrades.buyUpgrade up $ set message ("Upgraded " ++ Upgrades.upgradeName up) state

advance :: State -> State
advance state = suffer Disaster1 $ set age (nextAge state.age) state
