module Render.Stone
  ( side
  , upgradesComponent
  , advanceComponent
  ) where

import Prelude hiding (div)
import Types
import Lenses
import Population
import Util

import Upgrades.Stone

import Data.Lens (LensP(), (^.))

import Halogen (Render())
import Halogen.HTML.Indexed (div, div_, text, br_, a, i, span)
import Halogen.HTML.Properties.Indexed (I(), IProp(),id_, href, title)
import Halogen.HTML.Events.Indexed (onMouseDown, input_)

side :: Render State Action
side state =
  div_
    [ text "Current clicks:" , br_
    , span [ mkClass "current-clicks bold" ] [ text $ prettify state.currentClicks ], br_
    , text "Total clicks:" , br_
    , text $ prettify state.totalClicks, br_
    , text "My click power:" , br_
    , text $ prettify state.burst , br_
    , text "Tribal click power:" , br_
    , text $ prettify state.cps , br_
    , text "Population:" , br_
    , text $ prettify $ population state
    , br_ ,br_
    , div
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
    ]

upgradesComponent :: Render State Action
upgradesComponent state =
  div_
    [ div [ mkClass "upgrades" ]
      [ upgradeButton misc1 state
      , upgradeButton misc2 state
      , upgradeButton tech1 state
      , upgradeButton tech2 state
      , upgradeButton phil1 state
      , upgradeButton phil2 state
      , upgradeButton poli1 state
      , upgradeButton poli2 state
      , upgradeButton science1 state
      , upgradeButton science2 state
      ]
    ]

upgradeButton :: LensP Upgrades Upgrade -> Render State Action
upgradeButton uplens state =
  div (upgradeProps uplens state)
    [ div [ mkClass "name" ]
      [ text $ upgradeName (state ^. upgrades <<< uplens)
      , span [ mkClass "level" ]
        [ text $ " " ++ (show $ state ^. upgrades <<< uplens <<< viewLevel) ]
      ]
    , div [ mkClass "cost" ]
      [ text $ prettify $ upgradeCost $ nextUpgrade $ state ^. upgrades <<< uplens ]
    ]

upgradeProps :: forall e. LensP Upgrades Upgrade -> State -> Array (IProp (class :: I, onMouseDown :: I, title :: I | e) (Action Unit))
upgradeProps uplens state =
  let clickAction =
        onMouseDown $ input_ $ Buy $ nextUpgrade $ state ^. upgrades <<< uplens
      hoverText state uplens =
        [ title $ upgradeDescription (state ^. upgrades <<< uplens) ]
   in hoverText state uplens ++
      if canBuyUpgrade state uplens
         then [ clickAction, mkClass "upgrade" ]
         else [ mkClass "upgrade disabled" ]

advanceComponent :: Render State Action
advanceComponent state =
  div_
    [ div [ mkClass "advance" ]
      [ div [ onMouseDown $ input_ Advance ]
        [ text "Advance" ]
      ]
    ]
