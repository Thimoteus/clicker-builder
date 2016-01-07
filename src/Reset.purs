module Reset (
  reset
  ) where

import Prelude

import Save
import Types

reset :: State -> State
reset _ = initialState
