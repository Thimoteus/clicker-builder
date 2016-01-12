module Population (
  population
  ) where

import Prelude
import Types
import Math
import Lenses

import Data.Foldable (foldl)
import Data.Int (toNumber)
import Data.Lens ((^.))

population :: State -> Population
population state =
  let a = log (log (1.0 + state ^. totalClicksNumber ) + 1.0)
      c = sumUpgrades state.upgrades
   in Population (2.0 * a + c + 2.0)

sumUpgrades :: Upgrades -> Number
sumUpgrades u =
  let int = foldl g 0 [misc1, misc2, tech1, tech2, phil1, phil2, poli1, poli2, science1, science2]
      g acc uplens = acc + (u ^. uplens <<< viewLevel)
   in toNumber int
