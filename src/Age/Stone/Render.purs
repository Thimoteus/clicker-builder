module Age.Stone.Render
  ( side
  , upgradesComponent
  , advanceComponent
  ) where

import Prelude hiding (div)
import Types
import Lenses
import Population
import Util

import Render.Side

import Age.Stone.Upgrades
import Age.Stone.Advance

import Data.Lens (LensP(), (^.))
import Data.String (fromCharArray, null)
import Data.Array (replicate)

import Halogen (Render())
import Halogen.Component (ComponentHTML())
import Halogen.HTML.Indexed (div, div_, text, br_, span, p, p_)
import Halogen.HTML.Properties.Indexed (I(), IProp(), title)
import Halogen.HTML.Events.Indexed (onClick, onMouseDown, input_)

side :: Render State Action
side state =
  div_
    [ text "Current clicks:" , br_
    , span [ mkClass "current-clicks bold" ] [ text $ prettify state.currentClicks ]
    , sideLabel "Total clicks:"
    , text $ prettify state.totalClicks, br_
    , sideLabel "My click power:"
    , text $ prettify state.burst , br_
    , sideLabel "Tribal click power:"
    , text $ prettify state.cps , br_
    , sideLabel "Population:"
    , text $ prettify $ population state
    , br_ ,br_
    , theButton
    ]

upgradesComponent :: Render State Action
upgradesComponent state =
  div [ mkClass "upgrades" ]
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
  div [ mkClass "viewAdvance" ]
    [ span [ mkClass "dropCap" ] [ text """You must discover how to smelt bronze and attain enough
    language proficiency. The following shows a rough estimate of how close you
    are to advancing to the next age:""" ]
    , p [ mkClass "advanceBar" ]
      [ text "0 "
      , span [ mkClass "advance filled" ] [ text filledBars ]
      , span [ mkClass "advance unfilled" ] [ text unfilledBars ]
      , text " 100"
      ]
    , showAdvanceButton extraClass
    , p_ [ text """Warning: advancing a culture is never easy. Be prepared with your
         clicking finger ... """ ]
    ]
      where
        l = perhalfcentAdvanced state
        filledBars = fromCharArray $ replicate l '|'
        unfilledBars = fromCharArray $ replicate (50 - l) '|'
        extraClass =
          if l >= 50
             then ""
             else " disabled"

showAdvanceButton :: String -> ComponentHTML Action
showAdvanceButton extraClass =
  div [ mkClass $ "advanceButton" ++ extraClass ]
      [ div [ onClick $ input_ Advance ] -- (if null extraClass then [ onClick $ input_ Advance ] else [])
        [ text "Advance" ]
      ]
