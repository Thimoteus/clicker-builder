module Age.Bronze.Eval
  ( evalClick
  , autoclick
  ) where

import Prelude
import Math (log)
import Util ((^))
import Lenses
import Types

import Data.Time (Milliseconds())
import Data.Maybe (Maybe(..))
import Data.Lens ((.~), (+~), (-~), (^?))

import Age.Bronze (getBronzeState, isSuffering)

evalClick :: State → State
evalClick state
  | isSuffering state = soothe state
  | otherwise = increasePopulation state

soothe :: State → State
soothe state =
  let n = _.disasterStack $ unsafeBronze getBronzeState state
   in if n <= 0
         then stopSuffering state
         else lowerSuffering state

stopSuffering :: State → State
stopSuffering = ageState <<< bronzeState <<< bronzeStack .~ 0

lowerSuffering :: State → State
lowerSuffering state = ageState
                   <<< bronzeState
                   <<< bronzeStack -~ (_.stackRemoval $ unsafeBronze getBronzeState state)
                     $ state

increasePopulation :: State → State
increasePopulation state =
  (ageState <<< bronzeState <<< bronzePop +~ clicksToPop state.burst) state

autoclick :: Milliseconds → State → State
autoclick ms state = (currentClicks +~ perSecond pop) state where
  pop = _.population $ unsafeBronze getBronzeState state
  perSecond (Population n) = Clicks (log (log (n / 10.0 + 1.0)) + 1.0)
