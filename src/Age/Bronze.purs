module Age.Bronze where

import Prelude
import Types
import Lenses

import Data.Maybe.Unsafe (fromJust)
import Data.Lens (preview)

getBronzeState :: (UnsafeBronze) => State -> BronzeSRec
getBronzeState = fromJust <<< preview bronzeState <<< _.ageState
