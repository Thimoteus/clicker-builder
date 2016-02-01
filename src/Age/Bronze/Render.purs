module Age.Bronze.Render where

import Prelude hiding (div)
import Types
import Util
import Lenses

import Render.Side
import Age.Bronze

import Halogen (Render())
import Halogen.HTML.Indexed (div, text, br_, span)

side :: Render State Action
side state =
  div [ mkClass $ sufferingClass state.suffering ]
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
  div [ mkClass $ "upgrades" ++ sufferingClass state.suffering ]
      [ text "blah blah" ]

sufferingClass :: Boolean -> String
sufferingClass true = " shake-hard shake-constant"
sufferingClass _ = ""
