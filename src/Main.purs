module Main where

import Prelude hiding (div, top, bottom)

import Data.Lens (LensP(), (+~), (^.), set, (.~))
import Data.Tuple (Tuple(..))
import Data.String (null)
import Data.Functor ((<$))
import Data.Date (nowEpochMilliseconds)

import Control.Monad.Aff (Aff(), runAff, later)
import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Class (liftEff)
import Control.Monad.Eff.Exception (throwException)
import Control.Monad.Eff.Console (log)

import Halogen
  ( Component(), component
  , Eval(), Render()
  , runUI, modify, action, get, gets, liftEff', liftAff'
  )
import Halogen.Util (appendToBody, onLoad)
import Halogen.HTML.Indexed (div, div_, h1, h3_, text, br_, a, i, span, p_)
import Halogen.HTML.Events.Indexed (onMouseDown, input_)
import Halogen.HTML.Properties.Indexed (id_, href, title)

import Types
import Lenses
import Save
import Upgrades
import Reset
import Disaster
import Age
import Util
import Population

interface :: Component State Action (Aff AppEffects)
interface = component render eval

render :: Render State Action
render state =
  div
    [ id_ "body", mkClass (show state.age) ]
    [ div
      [ id_ "container" ]
      [ top
      , side
      , main'
      , bottom
      ]
    ]
  where
    top =
      h1 [ id_ "title" ]
         [ text $ "clicker builder: the " ++ show state.age ++ " Age." ]
    side =
      div
        [ id_ "side" ]
        [ div_
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
          ]
        , br_
        , div
          [ id_ "clicker-wrapper" ]
          [ div
            [ onMouseDown $ input_ Click
            , id_ "the-button"
            , mkClass "shake-little"
            ]
            [ a
              [ href "#" ]
              [ i [ mkClass "fa fa-hand-pointer-o" ] [] ]
            ]
          ]
        , br_
        , span
          [ onMouseDown $ input_ Save
          , mkClass "button" ]
          [ text "Save" ]
        , br_
        , span
          [ onMouseDown $ input_ Reset
          , mkClass "button" ]
          [ text "Reset" ]
        ]
    main' =
      div
        [ id_ "main" ]
        [ div
          [ id_ "upgrades" ]
          [ upgradesComponent state ]
          , if null state.message
               then
                 div_
                   []
               else
                 div
                   [ mkClass "fade messages" ]
                   [ text state.message ]
        ]
    bottom = div [ id_ "bottom" ]
      [ h3_ [ text "About" ]
      , renderText $ ageDescription state.age
      , h3_ [ text "Changelog" ]
      , p_ [ text "Version so-alpha-it-doesn't-get-a-version-number." ]
      , h3_ [ text "Upcoming" ]
      , p_ [ text "Bronze Age, population, disasters, graphical representation." ]
      ]

upgradesComponent :: Render State Action
upgradesComponent state =
  div_
    [ div [ mkClass "upgrades cps" ]
      [ span [ mkClass "category" ]
        [ text "Tribal upgrades" ]
      , upgradeButton cps1 state
      , upgradeButton cps2 state
      , upgradeButton cps3 state
      , upgradeButton cps4 state
      , upgradeButton cps5 state
      ]
    , div [ mkClass "upgrades burst" ]
      [ span [ mkClass "category" ]
        [ text "Self upgrades" ]
      , upgradeButton burst1 state
      , upgradeButton burst2 state
      , upgradeButton burst3 state
      , upgradeButton burst4 state
      , upgradeButton burst5 state
      ]
    ]

upgradeButton :: LensP Upgrades Upgrade -> Render State Action
upgradeButton cpsn state =
  div (upgradeProps cpsn state)
    [ div [ mkClass "name" ]
      [ text $ upgradeName (state ^. upgrades <<< cpsn) state.age
      , span [ mkClass "level" ]
        [ text $ " " ++ (show $ state ^. upgrades <<< cpsn <<< viewLevel) ]
      ]
    , div [ mkClass "cost" ]
      [ text $ prettify $ upgradeCost $ nextUpgrade $ state ^. upgrades <<< cpsn ]
    ]

upgradeProps :: LensP Upgrades Upgrade -> State -> Array _
upgradeProps cpsn state =
  let clickAction =
        onMouseDown $ input_ $ Buy $ nextUpgrade $ state ^. upgrades <<< cpsn
      hoverText state cpsn =
        [ title $ upgradeDescription (state ^. upgrades <<< cpsn) state.age ]
   in hoverText state cpsn ++
      if canBuyUpgrade state cpsn
         then [ clickAction, mkClass "upgrade" ]
         else [ mkClass "upgrade disabled" ]

eval :: Eval Action State Action (Aff AppEffects)
eval (Click next) = next <$ do
  modify \ state -> ((currentClicksNumber +~ state ^. burstNumber)
                 <<< (totalClicksNumber +~ state ^. burstNumber)) state
eval (Autoclick next) = next <$ do
  savedTime <- gets _.now
  savedCPS <- gets _.cps
  currentTime <- liftEff' nowEpochMilliseconds
  let summand = calculateTimeDifferential (currentTime - savedTime) savedCPS
  modify $ (currentClicks +~ summand)
       <<< (totalClicks +~ summand) 
       <<< (now .~ currentTime)
  -- modify \ state -> ((currentClicksNumber +~ state ^. cpsNumber / 10.0)
                 -- <<< (totalClicksNumber +~ state ^. cpsNumber / 10.0)
                 -- <<< (now .~ currentTime)) state
eval (Reset next) = next <$ modify reset
eval (Save next) = next <$ do
  currentState <- get
  liftEff' $ log "Saving game ... "
  liftEff' $ saveState currentState
eval (Buy upgrade next) = next <$ do
  modify $ set message ""
  liftAff' $ later $ pure unit :: Aff AppEffects Unit
  modify $ buyUpgrade upgrade
  if isInflectionUpgrade upgrade
     then modify \ state -> set message (inflectionUpgradeMessage upgrade state.age) state
     else modify \ state -> set message ("Upgraded " ++ upgradeName upgrade state.age) state
eval (Suffer disaster next) = next <$ modify (suffer disaster)
eval (Unmessage next) = next <$ modify (set message "")

main :: Eff AppEffects Unit
main = runAff throwException (const $ pure unit) do
  savedState <- liftEff getSavedState
  app <- runUI interface savedState
  onLoad $ appendToBody app.node
  schedule [ Tuple 100 $ app.driver $ action Autoclick
           , Tuple 15000 $ app.driver $ action Save ]
