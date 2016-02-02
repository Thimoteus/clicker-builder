module Age.Bronze.Eval
  ( evalClick
  ) where

import Prelude
import Lenses
import Types

import Data.Maybe (Maybe(..))
import Data.Lens ((.~), (+~), (-~), (^?))

import Age.Bronze (getBronzeState)

evalClick :: State -> State
evalClick state =
  if suffering
     then soothe state
     else increasePopulation state
   where
     suffering = case state.ageState ^? bronzeState <<< bronzeStack of
                      Just x -> x > 0
                      Nothing -> false

soothe :: State -> State
soothe state =
  let n = _.disasterStack $ unsafeBronze getBronzeState state
   in if n <= 0
         then stopSuffering state
         else lowerSuffering state

stopSuffering :: State -> State
stopSuffering = ageState <<< bronzeState <<< bronzeStack .~ 0

lowerSuffering :: State -> State
lowerSuffering = ageState <<< bronzeState <<< bronzeStack -~ 1

increasePopulation :: State -> State
increasePopulation state =
  (ageState <<< bronzeState <<< bronzePop +~ clicksToPop state.burst) state
