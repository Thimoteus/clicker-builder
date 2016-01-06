module Main where

import Prelude hiding (div, top, bottom)

import Data.Lens (LensP(), (+~), (^.))
import Data.Foldable (fold)

import Control.Monad.Aff (Aff(), runAff, later')
import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Class (liftEff)
import Control.Monad.Eff.Exception (throwException)
import Control.Monad.Rec.Class (forever)

import Halogen
  ( Component(), component
  , Eval(), Render()
  , runUI, modify, action, get, liftEff'
  )
import Halogen.Util (appendToBody, onLoad)
import Halogen.HTML.Indexed (div, div_, h1_, text, button, br_, a, i, className)
import Halogen.HTML.Events.Indexed (onMouseDown, input_)
import Halogen.HTML.Properties.Indexed (disabled, id_, href, class_, title)

import Types
import Lenses
import Save
import Upgrades

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
    top = h1_ [ text "clicker builder" ]
    side = div [ id_ "side" ]
      [ div_
        [ text "Current clicks:"
        , br_
        , text (prettify state.currentClicks)
        , br_
        , text "Burst:"
        , br_
        , text (prettify state.burst)
        , br_
        , text "CPS:"
        , br_
        , text (prettify state.cps)
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
      ]
    main' = div [ id_ "main" ]
      [ button
        [ onMouseDown (input_ Save) ]
        [ text "Save" ]
      , button
        [ onMouseDown (input_ Reset) ]
        [ text "Reset" ]
      , div
        [ id_ "upgrades" ]
        [ upgradesComponent state ]
      ]
    bottom = div [ id_ "bottom" ]
      [ text """
      clicker builder is an incremental click-based game where you play a
      civilization from its humble beginnings in the stone age to its mastery
      of the universe.
      """ ]

upgradesComponent :: Render State Action
upgradesComponent state =
  div_
    [ div [ class_ $ className "upgrades cps" ]
      [ text "CPS upgrades"
      , upgradeButton cps1 state
      , upgradeButton cps2 state
      , upgradeButton cps3 state
      , upgradeButton cps4 state
      , upgradeButton cps5 state
      ]
    , div [ class_ $ className "upgrades burst" ]
      [ text "Burst upgrades"
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
    [ div [ class_ (className "upgrade-name") ]
      [ text $ upgradeName (state ^. upgrades <<< cpsn) state.age ]
    , div [ class_ (className "upgrade-cost") ]
      [ text $ prettify $ upgradeCost $ nextUpgrade $ state ^. upgrades <<< cpsn ]
    ]

upgradeProps :: LensP Upgrades Upgrade -> State -> Array _
upgradeProps cpsn state =
  let clickAction =
        onMouseDown $ input_ $ Buy $ nextUpgrade $ state ^. upgrades <<< cpsn
      hoverText state cpsn =
        [ title $ upgradeDescription (state ^. upgrades <<< cpsn) state.age ]
   in --[disabled $ not $ canBuyUpgrade state cpsn] ++
      hoverText state cpsn ++
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
  modify $ const initialState
  pure next
eval (Save next) = do
  currentState <- get
  liftEff' $ saveState currentState
  pure next
eval (Buy upgrade next) = do
  modify $ buyUpgrade upgrade
  pure next

main :: Eff AppEffects Unit
main = runAff throwException (const (pure unit)) do
  savedState <- liftEff getSavedState
  app <- runUI interface savedState
  onLoad $ appendToBody app.node
  --forever do
    --app.driver $ action Save
    --later' 15000 $ pure unit
  forever do
    app.driver $ action Autoclick
    later' 100 $ pure unit
