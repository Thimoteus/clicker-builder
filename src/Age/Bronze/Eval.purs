module Age.Bronze.Eval
  ( evalClick
  ) where

import Prelude
import Lenses
import Types

import Data.Lens ((.~), (+~), (-~))

import Age.Bronze (getBronzeState)

evalClick :: State -> State
evalClick state =
  if state.suffering
     then lessenSuffering state
     else increasePopulation state

lessenSuffering :: State -> State
lessenSuffering state =
  let n = _.disasterStack $ unsafeBronze getBronzeState state
   in if n <= 0
         then stopSuffering state
         else lowerSuffering state

stopSuffering :: State -> State
stopSuffering = (suffering .~ false)
            <<< resetStacks

resetStacks :: State -> State
resetStacks = ageState <<< bronzeState <<< bronzeStack .~ 0

lowerSuffering :: State -> State
lowerSuffering = ageState <<< bronzeState <<< bronzeStack -~ 1

increasePopulation :: State -> State
increasePopulation state =
  (ageState <<< bronzeState <<< bronzePop +~ clicksToPop state.burst) state
