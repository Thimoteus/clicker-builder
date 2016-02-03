module Render.Side where

import Prelude hiding (div)
import Types
import Util

import Halogen.Component (ComponentHTML())
import Halogen.HTML.Indexed (div, div_, text, br_, a, i, span, p, p_)
import Halogen.HTML.Properties.Indexed (id_, href)
import Halogen.HTML.Events.Indexed (onClick, onMouseDown, input_)

sideLabel :: String -> ComponentHTML Action
sideLabel str = p [ mkClass "label" ] [ text str ]

theButton :: ComponentHTML Action
theButton =
    div
      [ id_ "clicker-wrapper" ]
      [ div
        [ onMouseDown $ input_ Click
        , id_ "the-button"
        ]
        [ a
          [ href "#" ]
          [ i [ mkClass "fa fa-hand-pointer-o" ] [] ]
        ]
      ]
