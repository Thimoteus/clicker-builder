module Disaster (randomDisaster) where

import Prelude
import Types (Disaster(..))

import Data.Maybe (fromMaybe)
import Data.Array ((!!))
import Control.Monad.Eff.Random (RANDOM())
import Control.Monad.Eff.Random (randomInt)
import Control.Monad.Eff.Class (liftEff)
import Control.Monad.Aff (Aff())
--import Control.Monad.Eff (Eff())

randomDisaster :: ∀ aff. Aff ( random :: RANDOM | aff ) Disaster
randomDisaster = do
  n <- liftEff $ randomInt 0 5
  pure $ fromMaybe NoDisaster $ disastArr !! n

disastArr :: Array Disaster
disastArr = [ NoDisaster, Disaster1, Disaster2, Disaster3, Disaster4, Disaster5 ]
