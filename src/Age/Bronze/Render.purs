module Age.Bronze.Render
  ( side
  , upgradesComponent
  , advanceComponent
  , populationComponent
  , sufferingClass
  ) where

import Prelude hiding (div)
import Types
import Util
import Lenses

import Data.Maybe (maybe)
import Data.Lens (LensP(), PrismP(), (^.), (^?), review)

import Render.Side

import Age.Bronze
import Age.Bronze.Upgrades (upgradeName, upgradeCost)

import Halogen (Render())
import Halogen.HTML.Indexed (div_, div, text, br_, span)
import Halogen.HTML.Events.Indexed (onClick, input_)

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
      , popOrStacks state
      , br_, br_
      , theButton
      ]

popOrStacks :: Render State Action
popOrStacks state
  | isSuffering state =
    div [ mkClass "disaster" ]
        [ sideLabel "Disaster stacks:", text $ prettify $ unsafeBronze stacks state ]
  | otherwise = div_ [ sideLabel "Population:", text $ prettify $ unsafeBronze pop state ]

pop :: UnsafeBronze => State -> Population
pop = _.population <<< getBronzeState

stacks :: UnsafeBronze => State -> Int
stacks = _.disasterStack <<< getBronzeState

upgradesComponent :: Render State Action
upgradesComponent state =
  div [ mkClass $ "upgrades" ++ sufferingClass state ]
      [ mkUpgrade misc1 misc1P state
      , mkUpgrade misc2 misc2P state
      ]

mkUpgrade :: LensP Upgrades Upgrade -> PrismP Upgrade Int -> Render State Action
mkUpgrade upL upP state =
  div upgradeProps
      [ text $ upgradeName $ currUp ]
  where
  currUp = state.upgrades ^. upL
  level' = currUp ^. viewLevel + 1
  up' = review upP level'
  canBuy = state.currentClicks >= upgradeCost up'
  upgradeProps =
    if canBuy
       then [ onClick $ input_ $ Buy up', mkClass "upgrade" ]
       else [ mkClass "upgrade disabled" ]

advanceComponent :: Render State Action
advanceComponent state =
  div [ mkClass $ "advance" ++ sufferingClass state ]
      [ text "You're not sure what you need to do to advance." ]

populationComponent :: Render State Action
populationComponent state =
  div [ mkClass $ "population" ++ sufferingClass state ]
      [ text $ prettify $ unsafeBronze pop state ]

sufferingClass :: State -> String
sufferingClass state =
  maybe "" partitionClass $ state.ageState ^? bronzeState <<< bronzeStack

partitionClass :: Int -> String
partitionClass n
  | n <= 0 = ""
  | n <= 33 = " shake-little shake-constant"
  | n <= 66 = " shake shake-constant"
  | otherwise = " shake-hard shake-constant"
