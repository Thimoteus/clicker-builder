module Age.Bronze.Eval
  ( evalClick
  ) where

import Prelude
import Lenses
import Types

import Data.Lens (set)

evalClick :: State -> State
evalClick state =
  if state.suffering
     then stopSuffering state
     else increasePopulation state

stopSuffering :: State -> State
stopSuffering = set suffering false

increasePopulation :: State -> State
increasePopulation = id
