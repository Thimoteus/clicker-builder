module Main where

import Prelude hiding (div, top, bottom)
import Types
import Lenses (tab, message)
import Save (getSavedState, saveState)
import Reset (resetSave, resetState)
import Age (ageDescription)
import Util (schedule, mkClass, renderParagraphs)

import Data.Lens (set)
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
import Halogen.Component (ComponentHTML())
import Halogen.HTML.Indexed (div, div_, h1, h3_, h3, text, br_, a, span, p_, img)
import Halogen.HTML.Events.Indexed (onMouseDown, input_)
import Halogen.HTML.Properties.Indexed (id_, href, src, alt)

import Age.Stone.Render (advanceComponent, upgradesComponent, side) as Stone
import Age.Stone.Eval (advance, autoclick, buyUpgrade, evalClick) as Stone
import Age.Bronze.Eval (autoclick, evalClick) as Bronze
import Age.Bronze.Render (advanceComponent, populationComponent, upgradesComponent, side, sufferingClass) as Bronze
import Disaster.Bronze (suffer) as Bronze

interface :: Component State Action (Aff AppEffects)
interface = component render eval

render :: Render State Action
render state =
  div
    [ id_ "body", mkClass $ show state.age ++ " " ++ adjustBody state ]
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
        [ viewSide state
        , br_
        , span
          [ onMouseDown $ input_ Save
          , mkClass "button" ]
          [ text "Save" ]
        , divider
        , span
          [ onMouseDown $ input_ Reset
          , mkClass "button" ]
          [ text "Reset" ]
        ]
    main' =
      div
        [ id_ "main" ]
        [ div
          [ id_ "view" ]
          [ unlockViewTabs state
          , viewTabs state
          ]
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
      [ h3_ [ text "The story so far:" ]
      , renderParagraphs $ ageDescription state.age
      , h3_ [ text "Changelog" ]
      , renderParagraphs
        [ "Bronze age implemented, population, disasters, graphics" ]
      , h3_ [ text "Upcoming" ]
      , p_ [ text "Iron Age, heroes." ]
      , h3_ [ text "Credits" ]
      , renderParagraphs
        [ "Font: Silkscreen by Jason Kottke.", "Icons: fontawesome by Dave Gandy.", "Ideas and feedback: Himrin." ]
      ]

adjustBody :: State → String
adjustBody state =
  case state.age of
       Stone → ""
       Bronze → Bronze.sufferingClass state
       _ → "" -- FIXME

viewSide :: Render State Action
viewSide state =
  case state.age of
       Stone -> Stone.side state
       Bronze -> Bronze.side state
       _ -> Stone.side state --FIXME

unlockViewTabs :: Render State Action
unlockViewTabs state =
  h3 [ mkClass "title" ]
  ([ span
    [ mkClass "tab"
    , onMouseDown $ input_ $ View UpgradesTab ]
    [ text $ show UpgradesTab ]
  , divider
  , span
    [ mkClass "tab"
    , onMouseDown $ input_ $ View AdvanceTab ]
    [ text $ show AdvanceTab ]] ++ tabByAge state.age)
      where
      tabByAge :: Age -> Array (ComponentHTML Action)
      tabByAge Stone = []
      tabByAge Bronze = [ divider
                        , span [ mkClass "tab"
                               , onMouseDown $ input_ $ View PopulationTab ]
                               [ text $ show PopulationTab ]
                        ]
      tabByAge _ = tabByAge Bronze
                ++ [ divider
                   , span [ mkClass "tab" ] [ text $ show TechTreeTab ]]

divider :: ComponentHTML Action
divider = span [ mkClass "divide" ] [ text " | " ]

viewTabs :: Render State Action
viewTabs state =
  case state.view of
       UpgradesTab -> upgradesComponent state
       AdvanceTab -> advanceComponent state
       PopulationTab -> populationComponent state
       HeroesTab -> heroesComponent state
       TechTreeTab -> techTreeComponent state

upgradesComponent :: Render State Action
upgradesComponent state =
  case state.age of
       Stone -> Stone.upgradesComponent state
       Bronze -> Bronze.upgradesComponent state
       _ -> Stone.upgradesComponent state -- FIXME

populationComponent :: Render State Action
populationComponent state =
  case state.age of
       Bronze → Bronze.populationComponent state
       _ -> text ""

advanceComponent :: Render State Action
advanceComponent state =
  case state.age of
       Stone -> Stone.advanceComponent state
       Bronze -> Bronze.advanceComponent state
       _ -> Stone.advanceComponent state --FIXME

heroesComponent :: Render State Action
heroesComponent state =
  div_
    [ div [ mkClass "heroes" ]
      [ text ""
      ]
    ]

techTreeComponent :: Render State Action
techTreeComponent state =
  div_
    [ div [ mkClass "techTree" ]
      [ text ""
      ]
    ]

eval :: Eval Action State Action (Aff AppEffects)
eval (Click next) = next <$ do
  currentState <- get
  modify case currentState.age of
              Stone -> Stone.evalClick
              Bronze -> Bronze.evalClick
              _ -> Stone.evalClick --FIXME
eval (Buy upgrade next) = next <$ do
  modify $ set message ""
  liftAff' $ later $ pure unit :: Aff AppEffects Unit
  currentState <- get
  modify case currentState.age of
              Stone -> Stone.buyUpgrade upgrade
              _ -> Stone.buyUpgrade upgrade --FIXME
eval (Suffer disaster next) = next <$ do
  currentAge <- gets _.age
  modify case currentAge of
              Bronze -> Bronze.suffer disaster
              _ -> id
eval (Autoclick next) = next <$ do
  currentAge <- gets _.age
  currentTime <- liftEff' nowEpochMilliseconds
  modify case currentAge of
              Stone -> Stone.autoclick currentTime
              Bronze -> Bronze.autoclick currentTime
              _ -> Stone.autoclick currentTime
  -- savedTime <- gets _.now
  -- savedCPS <- gets _.cps
  -- currentTime <- liftEff' nowEpochMilliseconds
  -- let delta = currentTime - savedTime
      -- summand = calculateTimeDifferential delta savedCPS
  -- modify $ (currentClicks +~ summand)
       -- <<< (totalClicks +~ summand)
       -- <<< (now .~ currentTime)
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
eval (View t next) = next <$ modify (set tab t)
eval (Advance next) = next <$ do
  currentAge <- gets _.age
  modify case currentAge of
              Stone -> Stone.advance
              _ -> Stone.advance --FIXME

main :: Eff AppEffects Unit
main = runAff throwException (const $ pure unit) do
  savedState <- liftEff getSavedState
  app <- runUI interface savedState
  onLoad $ appendToBody app.node
  schedule [ Tuple 100 $ app.driver $ action Autoclick ]
           -- , Tuple 15000 $ app.driver $ action Autosave ]

