module Age.Bronze where

import Prelude
import Types
import Lenses

import Data.Maybe.Unsafe (fromJust)
import Data.Lens (preview, (^?))
import Data.Maybe (Maybe(..))

getBronzeState :: (UnsafeBronze) => State -> BronzeSRec
getBronzeState = fromJust <<< preview bronzeState <<< _.ageState

isSuffering :: State -> Boolean
isSuffering state =
  case state.ageState ^? bronzeState <<< bronzeStack of
       Just x → x > 0
       Nothing → false

