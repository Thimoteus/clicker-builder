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
  let int = foldl g 0 [cps1, cps2, cps3, cps4, cps5, burst1, burst2, burst3, burst4, burst5]
      g acc cpsn = acc + (u ^. cpsn <<< viewLevel)
   in toNumber int
