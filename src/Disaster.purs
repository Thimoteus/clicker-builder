module Disaster (
  suffer
  ) where

import Prelude
import Types

suffer :: Disaster -> State -> State
suffer _ = id
