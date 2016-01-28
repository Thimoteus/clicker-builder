module Main where

import Prelude hiding (div, top, bottom)
import Types
import Lenses
import Save
import Upgrades
import Reset
import Disaster
import Age
import Util
import Population

import Data.Lens (LensP(), (+~), (^.), set, (.~))
import Data.Tuple (Tuple(..))
import Data.String (null)
import Data.Functor ((<$))
import Data.Date (nowEpochMilliseconds)

--import Control.Monad (when)
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
import Halogen.HTML.Indexed (div, div_, h1, h3_, h3, text, br_, a, i, span, p_, img)
import Halogen.HTML.Events.Indexed (onMouseDown, input_)
import Halogen.HTML.Properties.Indexed (id_, href, title, src, alt)

interface :: Component State Action (Aff AppEffects)
interface = component render eval

render :: Render State Action
render state =
  div
    [ id_ "body", mkClass (show state.age) ]
    [ a
      [ href "https://github.com/thimoteus/clicker-builder"
      , id_ "fork-me" ]
      [ img
        [ src "https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67"
        , alt "Fork me on Github" ]
      ]
    , div
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
         [ text "clicker builder: the "
         , span [ mkClass $ show state.age ] [ text $ show state.age ]
         , text " Age." ]
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
        , text " | "
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
          [ h3 [ mkClass "title" ] [ text "Upgrades" ]
          , upgradesComponent state ]
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
      , renderParagraphs $ ageDescription state.age
      , h3_ [ text "Changelog" ]
      , p_ [ text "First beta!" ]
      , h3_ [ text "Upcoming" ]
      , p_ [ text "Bronze Age, population, disasters, graphical representation." ]
      , h3_ [ text "Credits" ]
      , renderParagraphs
        [ "Font: Silkscreen by Jason Kottke.", "Icons: fontawesome by Dave Gandy.", "Ideas and feedback: Himrin." ]
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
      [ text $ upgradeName (state ^. upgrades <<< uplens) state.age
      , span [ mkClass "level" ]
        [ text $ " " ++ (show $ state ^. upgrades <<< uplens <<< viewLevel) ]
      ]
    , div [ mkClass "cost" ]
      [ text $ prettify $ upgradeCost $ nextUpgrade $ state ^. upgrades <<< uplens ]
    ]

upgradeProps :: LensP Upgrades Upgrade -> State -> Array _
upgradeProps uplens state =
  let clickAction =
        onMouseDown $ input_ $ Buy $ nextUpgrade $ state ^. upgrades <<< uplens
      hoverText state uplens =
        [ title $ upgradeDescription (state ^. upgrades <<< uplens) state.age ]
   in hoverText state uplens ++
      if canBuyUpgrade state uplens
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
  let delta = currentTime - savedTime
      summand = calculateTimeDifferential delta savedCPS
  modify $ (currentClicks +~ summand)
       <<< (totalClicks +~ summand)
       <<< (now .~ currentTime)
eval (Reset next) = next <$ do
  modify resetState
  liftEff' resetSave
eval (Save next) = next <$ do
  currentState <- get
  modify $ set message ""
  liftAff' $ later $ pure unit :: Aff AppEffects Unit
  liftEff' $ saveState currentState
  modify $ set message "Game saved"
eval (Autosave next) = next <$ do
  currentState <- get
  liftEff' $ log "Autosaving game ... "
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
           , Tuple 15000 $ app.driver $ action Autosave ]

