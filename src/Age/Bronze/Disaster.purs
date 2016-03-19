module Age.Bronze.Disaster
  ( showDisaster
  ) where

import Types

showDisaster :: Disaster -> String
showDisaster Disaster1 = "Earthquake"
showDisaster Disaster2 = "Blizzard"
showDisaster Disaster3 = "Solar eclipse"
showDisaster Disaster4 = "Famine"
showDisaster Disaster5 = "War"
showDisaster NoDisaster = "Nothing, for now ... "
