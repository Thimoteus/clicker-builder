module Reset (
  reset
  ) where

import Prelude

import Types

reset :: State -> State
reset _ = initialState
