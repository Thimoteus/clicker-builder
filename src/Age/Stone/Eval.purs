module Age.Stone.Eval
  ( evalClick
  , buyUpgrade
  , advance
  , autoclick
  ) where

import Prelude
import Types
import Lenses
import Age (nextAge)
import Save (calculateTimeDifferential)

import Data.Lens ((+~), (^.), (*~), (.~), set)
import Data.Time (Milliseconds())

import Age.Stone.Upgrades as Upgrades
import Disaster.Bronze (minorQuake)
import Age.Bronze.Eval (suffer)

evalClick :: State → State
evalClick state = ((currentClicksNumber +~ state ^. burstNumber)
                 <<< (totalClicksNumber +~ state ^. burstNumber)) state

buyUpgrade :: Upgrade → State → State
buyUpgrade up state
  | Upgrades.isInflectionUpgrade up =
    Upgrades.buyUpgrade up $ set message (Upgrades.inflectionUpgradeMessage up) state
  | otherwise = Upgrades.buyUpgrade up $ set message ("Upgraded " ++ Upgrades.upgradeName up) state

autoclick :: Milliseconds → State → State
autoclick ms state =
  (currentClicks +~ summand) <<< (totalClicks +~ summand) <<< (now .~ ms) $ state
    where
    delta = ms - state.now
    summand = calculateTimeDifferential delta state.cps

advance :: State → State
advance state = suffer minorQuake
            <<< set ageState (BronzeS { population: Population 10.0, disasterStack: 0, stackRemoval: 1 })
            <<< set age (nextAge state.age)
            <<< set upgrades initialUpgrades
            <<< (currentClicks *~ Clicks 0.3)
              $ state
