module Age.Stone.Advance
  ( perhalfcentAdvanced
  ) where

import Prelude
import Lenses
import Types

import Data.Lens ((^.))
import Data.Int (toNumber, round)

import Age.Stone.Upgrades

perhalfcentAdvanced :: State -> Int
perhalfcentAdvanced state = n where
  firstClicks = state ^. upgrades <<< misc1 <<< viewLevel
  lastClicks = state ^. upgrades <<< science2 <<< viewLevel
  currClicks = state ^. currentClicks <<< clicks
  firstClickPart = if firstClicks >= 100
                      then 1.0
                      else toNumber firstClicks / 100.0
  lastClickPart = if lastClicks >= 1 || currClicks >= upgradeCost (Science2 1) ^. clicks
                     then 1.0
                     else currClicks / (upgradeCost (Science2 1) ^. clicks)
  n = round $ 25.0 * lastClickPart + 25.0 * firstClickPart
