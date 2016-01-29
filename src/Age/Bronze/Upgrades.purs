module Age.Bronze.Upgrades
  ( upgradeName
  , upgradeDescription
  ) where

import Types

upgradeName :: Upgrade -> String
upgradeName (Science1 _) = "abstract numbers"

upgradeDescription :: Upgrade -> String
upgradeDescription (Science1 _) = "You've discovered that two clicks and two dogs both share 'twoness.' You also almost discovered the ultrafilter lemma, but you couldn't write it down fast enough. Because you haven't discovered writing yet."
