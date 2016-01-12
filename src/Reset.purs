module Reset
  ( resetState
  , resetSave
  ) where

import Prelude
import Types

import Browser.WebStorage (localStorage, clear)

import Control.Monad.Eff (Eff())

resetState :: State -> State
resetState _ = initialState

resetSave :: Eff AppEffects Unit
resetSave = clear localStorage
