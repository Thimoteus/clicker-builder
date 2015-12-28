module Upgrades
  ( upgradeToNumber
  ) where

import Prelude
import Data.Int (toNumber)
import Types
import Util

upgradeToNumber :: Upgrade -> Number
upgradeToNumber (CPS1 n _) = makeUpgrade 50 n
upgradeToNumber (CPS2 n _) = makeUpgrade 100 n
upgradeToNumber (CPS3 n _) = makeUpgrade 500 n
upgradeToNumber (CPS4 n _) = makeUpgrade 1000 n
upgradeToNumber (CPS5 n _) = makeUpgrade 10000 n
upgradeToNumber _ = 0.0

makeUpgrade :: Int -> Int -> Number
makeUpgrade coeff total = upgradePolynomial (toNumber coeff) $ toNumber total

upgradePolynomial :: Number -> Number -> Number
upgradePolynomial coeff total = coeff + coeff * 0.1 * total ^ 2.0 + 10.0 * total + 13.0
