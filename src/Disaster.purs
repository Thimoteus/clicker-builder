module Disaster (
  suffer
  ) where

import Prelude
import Types
import Lenses

import Data.Lens (set)

suffer :: Disaster -> State -> State
suffer d = set suffering true
