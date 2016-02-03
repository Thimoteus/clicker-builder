module Age.Stone.Eval
  ( evalClick
  , buyUpgrade
  , advance
  ) where

import Prelude
import Types
import Lenses
import Age
import Disaster.Bronze

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
advance state = suffer earthquake
            <<< set ageState (BronzeS { population: Population 10.0, disasterStack: 0, stackRemoval: 1 })
            <<< set age (nextAge state.age)
            <<< set currentClicks (Clicks 0.0)
              $ state
