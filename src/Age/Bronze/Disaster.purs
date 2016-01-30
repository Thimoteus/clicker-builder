module Age.Bronze.Disaster
  ( showDisaster
  ) where

import Prelude
import Types
import Lenses

import Data.Lens (set)

showDisaster :: Disaster -> String
showDisaster Disaster1 = "Earthquake"
showDisaster Disaster2 = "Blizzard"
showDisaster Disaster3 = "Solar eclipse"
showDisaster Disaster4 = "Famine"
showDisaster Disaster5 = "War"
showDisaster NoDisaster = "Nothing, for now ... "
