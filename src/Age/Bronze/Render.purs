module Age.Bronze.Render
  ( side
  , upgradesComponent
  ) where

import Prelude hiding (div)
import Types
import Util
import Lenses

import Data.Maybe (Maybe(..))
import Data.Lens ((^?))

import Render.Side
import Age.Bronze

import Halogen (Render())
import Halogen.HTML.Indexed (div, text, br_, span)

side :: Render State Action
side state =
  div [ mkClass $ sufferingClass state ]
    [ text "Current clicks:" , br_
    , span [ mkClass "current-clicks bold" ] [ text $ prettify state.currentClicks ]
    , sideLabel "Total clicks:"
    , text $ prettify state.totalClicks, br_
    , sideLabel "My click power:"
    , text $ prettify state.burst , br_
    , sideLabel "Tribal click power:"
    , text $ prettify state.cps , br_
    , sideLabel "Population:"
    , text $ prettify $ unsafeBronze pop state
    , br_ ,br_
    , theButton
    ]

pop :: UnsafeBronze => State -> Population
pop = _.population <<< getBronzeState

upgradesComponent :: Render State Action
upgradesComponent state =
  div [ mkClass $ "upgrades" ++ sufferingClass state ]
      [ text "blah blah" ]

sufferingClass :: State -> String
sufferingClass state =
  case state.ageState ^? bronzeState <<< bronzeStack of
       Just x -> partitionClass x
       Nothing -> ""

partitionClass :: Int -> String
partitionClass n
  | n <= 0 = ""
  | n <= 33 = " shake-little shake-constant"
  | n <= 66 = " shake shake-constant"
  | otherwise = "shake-hard shake-constant"
