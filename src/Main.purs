module Main where

import Prelude hiding (div, top, bottom)

import Data.Lens (LensP(), (+~), (^.), set)
import Data.Tuple (Tuple(..))
import Data.String (null)

import Control.Monad.Aff (Aff(), runAff, later)
import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Class (liftEff)
import Control.Monad.Eff.Exception (throwException)
import Control.Monad.Eff.Console (log)

import Halogen
  ( Component(), component
  , Eval(), Render()
  , runUI, modify, action, get, liftEff', liftAff'
  )
import Halogen.Util (appendToBody, onLoad)
import Halogen.HTML.Indexed (div, div_, h1_, text, br_, a, i, className, span)
import Halogen.HTML.Events.Indexed (onMouseDown, input_)
import Halogen.HTML.Properties.Indexed (id_, href, class_, title)

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
  div_
    [ top
    , side
    , main'
    , bottom
    ]
  where
    top =
      h1_
        [ text ("clicker builder: the " ++ show state.age ++ " Age.") ]
    side =
      div
        [ id_ "side" ]
        [ div_
          [ text "Current clicks:" , br_
          , span [ class_ (className "bold") ] [ text (prettify state.currentClicks) ], br_
          , text "Total clicks:" , br_
          , text (prettify state.totalClicks), br_
          , text "Burst:" , br_
          , text (prettify state.burst) , br_
          , text "CPS:" , br_
          , text (prettify state.cps) , br_
          , text "Population:" , br_
          , text (prettify (population state))
          ]
        , br_
        , div
          [ id_ "clicker-wrapper" ]
          [ div
            [ onMouseDown (input_ Click)
            , id_ "the-button"
            ]
            [ a
              [ href "#" ]
              [ i [ class_ $ className "fa fa-hand-pointer-o" ] [] ]
            ]
          ]
        , br_
        , span
          [ onMouseDown (input_ Save)
          , class_ (className "button") ]
          [ text "Save" ]
        , br_
        , span
          [ onMouseDown (input_ Reset)
          , class_ (className "button") ]
          [ text "Reset" ]
        ]
    main' = div [ id_ "main" ]
      [ div
        [ id_ "upgrades" ]
        [ upgradesComponent state ]
      , if null state.message
           then
             div_
               [ ]
           else
             div
               [ class_ (className "fade messages") ]
               [ text state.message ]
      ]
    bottom = div [ id_ "bottom" ]
      [ text (ageDescription state.age), br_, br_
      , text "Changelog: Version so-alpha-it-doesn't-get-a-version-number.", br_
      , text "Upcoming:", br_
      , text "Bronze Age, population, randomly occurring disasters, 'graphics'." ]

upgradesComponent :: Render State Action
upgradesComponent state =
  div_
    [ div [ class_ $ className "upgrades cps" ]
      [ span [ class_ (className "category") ]
        [ text "CPS" ]
      , upgradeButton cps1 state
      , upgradeButton cps2 state
      , upgradeButton cps3 state
      , upgradeButton cps4 state
      , upgradeButton cps5 state
      ]
    , div [ class_ $ className "upgrades burst" ]
      [ span [ class_ (className "category") ]
        [ text "Burst" ]
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
    [ div [ class_ (className "name") ]
      [ text (upgradeName (state ^. upgrades <<< cpsn) state.age)
      , span [ class_ (className "level") ]
        [ text (" " ++ (show $ state ^. upgrades <<< cpsn <<< viewLevel)) ]
      ]
    , div [ class_ (className "cost") ]
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
         then [ clickAction, class_ (className "upgrade") ]
         else [ class_ (className "upgrade disabled") ]

eval :: Eval Action State Action (Aff AppEffects)
eval (Click next) = do
  modify $ \ state -> ((currentClicksNumber +~ state ^. burstNumber)
                   <<< (totalClicksNumber +~ state ^. burstNumber)) state
  pure next
eval (Autoclick next) = do
  modify \ state -> ((currentClicksNumber +~ state ^. cpsNumber / 10.0)
                 <<< (totalClicksNumber +~ state ^. cpsNumber / 10.0)) state
  pure next
eval (Reset next) = do
  modify reset
  pure next
eval (Save next) = do
  currentState <- get
  liftEff' $ log "Saving game ... "
  liftEff' $ saveState currentState
  pure next
eval (Buy upgrade next) = do
  modify (set message "")
  liftAff' (later (pure unit :: Aff AppEffects Unit))
  modify (buyUpgrade upgrade)
  if isInflectionUpgrade upgrade
     then modify (\ state -> set message (inflectionUpgradeMessage upgrade state.age) state)
     else modify (\ state -> set message ("Bought " ++ upgradeName upgrade state.age) state)
  pure next
eval (Suffer disaster next) = do
  modify $ suffer disaster
  pure next
eval (Unmessage next) = do
  modify (set message "")
  pure next

main :: Eff AppEffects Unit
main = runAff throwException (const (pure unit)) do
  savedState <- liftEff getSavedState
  app <- runUI interface savedState
  onLoad $ appendToBody app.node
  schedule [ Tuple 100 (app.driver (action Autoclick))
           , Tuple 15000 (app.driver (action Save)) ]
