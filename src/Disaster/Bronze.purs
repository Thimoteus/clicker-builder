module Disaster.Bronze where

import Prelude
import Types
import Lenses

import Data.Lens ((.~))

suffer :: Disaster -> State -> State
suffer d = ageState <<< bronzeState <<< bronzeStack .~ 100

earthquake :: Disaster
earthquake = Disaster1
