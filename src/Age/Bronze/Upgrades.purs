module Age.Bronze.Upgrades
  ( upgradeName
  , upgradeDescription
  , upgradeCost
  ) where

import Prelude
import Types

upgradeName :: Upgrade -> String
upgradeName (Misc1 _) = "navigational skills"
upgradeName (Misc2 _) = ""
upgradeName (Tech1 _) = "metal tools"
upgradeName (Tech2 _) = "hieroglyphs"
upgradeName (Phil1 _) = "royal funerals"
upgradeName (Phil2 _) = "polytheism"
upgradeName (Poli1 _) = "monarchy"
upgradeName (Poli2 _) = "city-states"
upgradeName (Science1 _) = ""
upgradeName (Science2 _) = "irrigation"

upgradeDescription :: Upgrade -> String
upgradeDescription (Science1 _) = ""
upgradeDescription (Science2 _) = ""
upgradeDescription (Misc1 _) = ""
upgradeDescription (Misc2 _) = ""
upgradeDescription (Tech1 _) = ""
upgradeDescription (Tech2 _) = "This writing system allows you to record anything for future generations. You use it to keep track of all the ways you"
upgradeDescription (Phil1 _) = ""
upgradeDescription (Phil2 _) = "If you pray to enough gods, maybe one of them will listen. Decreases stacks gained during disasters."
upgradeDescription (Poli1 _) = "Increase population gained per-click by asserting the iron grip of an ancient despot."
upgradeDescription (Poli2 _) = "People are now naturally banding into some kind of ... mega-tribe? Increases population gained by clicking."

upgradeCost :: Upgrade -> Clicks
upgradeCost _ = Clicks 0.0

{-- Possible upgrades:
* decrease stacks during disasters * 3, one per disaster
* decrease population lost during disasters * 3, once per disaster
* increase population gained by clicking
* increase clicks generated per population
8 so far
--}
