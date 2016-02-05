module Disaster.Bronze where

import Prelude
import Types
import Lenses

import Data.Lens ((.~))

minorQuake :: Disaster
minorQuake = Disaster1

medQuake :: Disaster
medQuake = Disaster2

bigQuake :: Disaster
bigQuake = Disaster3
